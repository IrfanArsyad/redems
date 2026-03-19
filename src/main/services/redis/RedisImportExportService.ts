import Redis from 'ioredis'
import { dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import type { ImportExportOptions } from '@shared/types/redis.types'
import { logger } from '../../utils/logger'

export class RedisImportExportService {
  async exportKeys(
    redis: Redis,
    keys: string[],
    options: ImportExportOptions
  ): Promise<string> {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Keys',
      defaultPath: `redis-export-${Date.now()}`,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'Redis Commands', extensions: ['redis'] }
      ]
    })

    if (canceled || !filePath) return ''

    let content = ''

    if (options.format === 'json') {
      content = await this.exportAsJson(redis, keys, options)
    } else if (options.format === 'csv') {
      content = await this.exportAsCsv(redis, keys, options)
    } else {
      content = await this.exportAsCommands(redis, keys, options)
    }

    await writeFile(filePath, content, 'utf-8')
    logger.info(`Exported ${keys.length} keys to ${filePath}`)
    return filePath
  }

  async importFile(redis: Redis): Promise<{ imported: number; errors: number }> {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Keys',
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'Redis Commands', extensions: ['redis'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) {
      return { imported: 0, errors: 0 }
    }

    const content = await readFile(filePaths[0], 'utf-8')
    let imported = 0
    let errors = 0

    if (filePaths[0].endsWith('.json')) {
      const data = JSON.parse(content)
      if (Array.isArray(data)) {
        for (const item of data) {
          try {
            await this.importKeyFromJson(redis, item)
            imported++
          } catch (e) {
            errors++
            logger.error(`Import error for key ${item.key}:`, e)
          }
        }
      }
    } else {
      // Redis commands format
      const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
      for (const line of lines) {
        try {
          const args = this.parseCommandLine(line)
          if (args.length > 0) {
            await (redis as any).call(...args)
            imported++
          }
        } catch (e) {
          errors++
        }
      }
    }

    logger.info(`Import complete: ${imported} imported, ${errors} errors`)
    return { imported, errors }
  }

  async dumpRestore(
    sourceRedis: Redis,
    targetRedis: Redis,
    keys: string[],
    replace: boolean
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const key of keys) {
      try {
        const ttl = await sourceRedis.pttl(key)
        const dump = await sourceRedis.dump(key)
        if (dump) {
          const restoreTtl = ttl > 0 ? ttl : 0
          const args: any[] = [key, restoreTtl, dump]
          if (replace) args.push('REPLACE')
          await (targetRedis as any).restore(...args)
          success++
        } else {
          failed++
        }
      } catch (e) {
        failed++
        logger.error(`DUMP/RESTORE failed for key ${key}:`, e)
      }
    }

    return { success, failed }
  }

  private async exportAsJson(
    redis: Redis,
    keys: string[],
    options: ImportExportOptions
  ): Promise<string> {
    const items: any[] = []
    for (const key of keys) {
      const type = await redis.type(key)
      const item: any = { key, type }

      if (options.includeTtl) {
        item.ttl = await redis.ttl(key)
      }

      if (options.includeValues) {
        item.value = await this.getValueByType(redis, key, type)
      }

      items.push(item)
    }
    return JSON.stringify(items, null, 2)
  }

  private async exportAsCsv(
    redis: Redis,
    keys: string[],
    options: ImportExportOptions
  ): Promise<string> {
    const headers = ['key', 'type']
    if (options.includeTtl) headers.push('ttl')
    if (options.includeValues) headers.push('value')

    const lines = [headers.join(',')]
    for (const key of keys) {
      const type = await redis.type(key)
      const row = [this.csvEscape(key), type]

      if (options.includeTtl) {
        row.push(String(await redis.ttl(key)))
      }

      if (options.includeValues) {
        const value = await this.getValueByType(redis, key, type)
        row.push(this.csvEscape(JSON.stringify(value)))
      }

      lines.push(row.join(','))
    }
    return lines.join('\n')
  }

  private async exportAsCommands(
    redis: Redis,
    keys: string[],
    options: ImportExportOptions
  ): Promise<string> {
    const commands: string[] = []
    for (const key of keys) {
      const type = await redis.type(key)
      if (!options.includeValues) {
        commands.push(`# ${key} (${type})`)
        continue
      }

      switch (type) {
        case 'string': {
          const val = await redis.get(key)
          commands.push(`SET ${this.escapeArg(key)} ${this.escapeArg(val || '')}`)
          break
        }
        case 'hash': {
          const hash = await redis.hgetall(key)
          const args = Object.entries(hash)
            .map(([f, v]) => `${this.escapeArg(f)} ${this.escapeArg(v)}`)
            .join(' ')
          commands.push(`HSET ${this.escapeArg(key)} ${args}`)
          break
        }
        case 'list': {
          const list = await redis.lrange(key, 0, -1)
          const args = list.map((v) => this.escapeArg(v)).join(' ')
          commands.push(`RPUSH ${this.escapeArg(key)} ${args}`)
          break
        }
        case 'set': {
          const members = await redis.smembers(key)
          const args = members.map((m) => this.escapeArg(m)).join(' ')
          commands.push(`SADD ${this.escapeArg(key)} ${args}`)
          break
        }
        case 'zset': {
          const data = await redis.zrange(key, 0, -1, 'WITHSCORES')
          const args: string[] = []
          for (let i = 0; i < data.length; i += 2) {
            args.push(data[i + 1], this.escapeArg(data[i]))
          }
          commands.push(`ZADD ${this.escapeArg(key)} ${args.join(' ')}`)
          break
        }
      }

      if (options.includeTtl) {
        const ttl = await redis.ttl(key)
        if (ttl > 0) {
          commands.push(`EXPIRE ${this.escapeArg(key)} ${ttl}`)
        }
      }
    }
    return commands.join('\n')
  }

  private async getValueByType(redis: Redis, key: string, type: string): Promise<any> {
    switch (type) {
      case 'string':
        return redis.get(key)
      case 'hash':
        return redis.hgetall(key)
      case 'list':
        return redis.lrange(key, 0, -1)
      case 'set':
        return redis.smembers(key)
      case 'zset': {
        const data = await redis.zrange(key, 0, -1, 'WITHSCORES')
        const result: Array<{ member: string; score: string }> = []
        for (let i = 0; i < data.length; i += 2) {
          result.push({ member: data[i], score: data[i + 1] })
        }
        return result
      }
      default:
        return null
    }
  }

  private async importKeyFromJson(redis: Redis, item: any): Promise<void> {
    const { key, type, value, ttl } = item
    switch (type) {
      case 'string':
        await redis.set(key, value)
        break
      case 'hash':
        await redis.hset(key, value)
        break
      case 'list':
        if (Array.isArray(value) && value.length > 0) {
          await redis.rpush(key, ...value)
        }
        break
      case 'set':
        if (Array.isArray(value) && value.length > 0) {
          await redis.sadd(key, ...value)
        }
        break
      case 'zset':
        if (Array.isArray(value)) {
          for (const v of value) {
            await redis.zadd(key, parseFloat(v.score), v.member)
          }
        }
        break
    }
    if (ttl && ttl > 0) {
      await redis.expire(key, ttl)
    }
  }

  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  private escapeArg(value: string): string {
    if (value.includes(' ') || value.includes('"') || value.includes("'")) {
      return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    }
    return value
  }

  private parseCommandLine(line: string): string[] {
    const args: string[] = []
    let current = ''
    let inDoubleQuote = false
    let inSingleQuote = false
    let escaped = false

    for (const char of line) {
      if (escaped) {
        current += char
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote
        continue
      }
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote
        continue
      }
      if (char === ' ' && !inDoubleQuote && !inSingleQuote) {
        if (current) {
          args.push(current)
          current = ''
        }
        continue
      }
      current += char
    }
    if (current) args.push(current)
    return args
  }
}
