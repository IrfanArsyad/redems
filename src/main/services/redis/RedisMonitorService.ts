import Redis from 'ioredis'
import type { MonitorEntry } from '@shared/types/redis.types'
import { logger } from '../../utils/logger'

export class RedisMonitorService {
  private monitors = new Map<string, Redis>()
  private dataCallback: ((connId: string, entry: MonitorEntry) => void) | null = null

  setDataCallback(cb: (connId: string, entry: MonitorEntry) => void): void {
    this.dataCallback = cb
  }

  async start(connId: string, originalRedis: Redis): Promise<void> {
    if (this.monitors.has(connId)) {
      logger.warn(`Monitor already running for ${connId}`)
      return
    }

    const monitorRedis = originalRedis.duplicate()
    this.monitors.set(connId, monitorRedis)

    monitorRedis.on('error', (err) => {
      logger.error(`Monitor error for ${connId}:`, err)
    })

    const monitor = await monitorRedis.monitor()

    monitor.on('monitor', (time: string, args: string[], source: string, database: string) => {
      const entry: MonitorEntry = {
        timestamp: parseFloat(time) * 1000,
        db: parseInt(database) || 0,
        client: source,
        command: args[0] || '',
        args: args.slice(1),
        raw: `${time} [${database} ${source}] ${args.join(' ')}`
      }
      this.dataCallback?.(connId, entry)
    })

    logger.info(`Monitor started for ${connId}`)
  }

  stop(connId: string): void {
    const monitor = this.monitors.get(connId)
    if (monitor) {
      monitor.disconnect()
      this.monitors.delete(connId)
      logger.info(`Monitor stopped for ${connId}`)
    }
  }

  stopAll(): void {
    for (const [id, monitor] of this.monitors) {
      monitor.disconnect()
      logger.info(`Monitor stopped for ${id}`)
    }
    this.monitors.clear()
  }

  isRunning(connId: string): boolean {
    return this.monitors.has(connId)
  }
}
