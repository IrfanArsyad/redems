import type Redis from 'ioredis'
import type { Cluster } from 'ioredis'

type RedisClient = Redis | Cluster

export class RedisCLIService {
  /**
   * Execute a raw Redis command string.
   * Parses the command respecting quoted strings and escape characters,
   * then calls redis.call() with the parsed command and arguments.
   *
   * Returns the raw ioredis response (string, number, array, null, etc.)
   */
  async execute(redis: RedisClient, command: string): Promise<unknown> {
    const parts = this.parseCommand(command)

    if (parts.length === 0) {
      throw new Error('Empty command')
    }

    const [cmd, ...args] = parts

    // Use redis.call which accepts any command as a string
    return await redis.call(cmd, ...args)
  }

  /**
   * Parse a command string into an array of arguments.
   * Handles:
   * - Single-quoted strings ('hello world')
   * - Double-quoted strings ("hello world")
   * - Escaped characters within quotes (\" \' \\ \n \t)
   * - Unquoted tokens separated by whitespace
   */
  private parseCommand(input: string): string[] {
    const args: string[] = []
    let i = 0
    const len = input.length

    while (i < len) {
      // Skip whitespace
      while (i < len && this.isWhitespace(input[i])) {
        i++
      }

      if (i >= len) break

      const char = input[i]

      if (char === '"') {
        // Double-quoted string
        i++ // skip opening quote
        let token = ''
        while (i < len && input[i] !== '"') {
          if (input[i] === '\\' && i + 1 < len) {
            // Handle escape sequences
            i++
            token += this.resolveEscape(input[i])
          } else {
            token += input[i]
          }
          i++
        }
        i++ // skip closing quote
        args.push(token)
      } else if (char === "'") {
        // Single-quoted string (no escape processing, consistent with Redis CLI)
        i++ // skip opening quote
        let token = ''
        while (i < len && input[i] !== "'") {
          token += input[i]
          i++
        }
        i++ // skip closing quote
        args.push(token)
      } else {
        // Unquoted token
        let token = ''
        while (i < len && !this.isWhitespace(input[i])) {
          token += input[i]
          i++
        }
        args.push(token)
      }
    }

    return args
  }

  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\r' || char === '\n'
  }

  /**
   * Resolve common escape sequences in double-quoted strings.
   */
  private resolveEscape(char: string): string {
    switch (char) {
      case 'n':
        return '\n'
      case 'r':
        return '\r'
      case 't':
        return '\t'
      case '"':
        return '"'
      case "'":
        return "'"
      case '\\':
        return '\\'
      default:
        // Return the character as-is if not a recognized escape
        return char
    }
  }
}
