type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m'  // red
}

const RESET = '\x1b[0m'

function formatTimestamp(): string {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const timestamp = formatTimestamp()
  const color = LOG_COLORS[level]
  const levelTag = level.toUpperCase().padEnd(5)
  const prefix = `${color}[Main] ${timestamp} ${levelTag}${RESET}`

  switch (level) {
    case 'debug':
      console.debug(prefix, message, ...args)
      break
    case 'info':
      console.log(prefix, message, ...args)
      break
    case 'warn':
      console.warn(prefix, message, ...args)
      break
    case 'error':
      console.error(prefix, message, ...args)
      break
  }
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    log('debug', message, ...args)
  },

  info(message: string, ...args: unknown[]): void {
    log('info', message, ...args)
  },

  warn(message: string, ...args: unknown[]): void {
    log('warn', message, ...args)
  },

  error(message: string, ...args: unknown[]): void {
    log('error', message, ...args)
  }
}
