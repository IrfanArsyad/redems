import Redis from 'ioredis'
import type { PubSubMessage } from '@shared/types/redis.types'
import { logger } from '../../utils/logger'

export class RedisPubSubService {
  private subscribers = new Map<string, Redis>()
  private messageCallback: ((connId: string, message: PubSubMessage) => void) | null = null

  setMessageCallback(cb: (connId: string, message: PubSubMessage) => void): void {
    this.messageCallback = cb
  }

  async subscribe(
    connId: string,
    originalRedis: Redis,
    channels: string[]
  ): Promise<void> {
    const sub = this.getOrCreateSubscriber(connId, originalRedis)
    await sub.subscribe(...channels)
    logger.info(`Subscribed to channels: ${channels.join(', ')} on ${connId}`)
  }

  async psubscribe(
    connId: string,
    originalRedis: Redis,
    patterns: string[]
  ): Promise<void> {
    const sub = this.getOrCreateSubscriber(connId, originalRedis)
    await sub.psubscribe(...patterns)
    logger.info(`Pattern subscribed: ${patterns.join(', ')} on ${connId}`)
  }

  async unsubscribe(connId: string, channels: string[]): Promise<void> {
    const sub = this.subscribers.get(connId)
    if (sub) {
      await sub.unsubscribe(...channels)
    }
  }

  async punsubscribe(connId: string, patterns: string[]): Promise<void> {
    const sub = this.subscribers.get(connId)
    if (sub) {
      await sub.punsubscribe(...patterns)
    }
  }

  async publish(redis: Redis, channel: string, message: string): Promise<number> {
    return redis.publish(channel, message)
  }

  cleanup(connId: string): void {
    const sub = this.subscribers.get(connId)
    if (sub) {
      sub.disconnect()
      this.subscribers.delete(connId)
      logger.info(`PubSub subscriber cleaned up for ${connId}`)
    }
  }

  cleanupAll(): void {
    for (const [id, sub] of this.subscribers) {
      sub.disconnect()
      logger.info(`PubSub subscriber cleaned up for ${id}`)
    }
    this.subscribers.clear()
  }

  private getOrCreateSubscriber(connId: string, originalRedis: Redis): Redis {
    let sub = this.subscribers.get(connId)
    if (!sub) {
      sub = originalRedis.duplicate()
      this.subscribers.set(connId, sub)

      sub.on('message', (channel: string, message: string) => {
        this.messageCallback?.(connId, {
          channel,
          message,
          timestamp: Date.now()
        })
      })

      sub.on('pmessage', (pattern: string, channel: string, message: string) => {
        this.messageCallback?.(connId, {
          channel,
          message,
          pattern,
          timestamp: Date.now()
        })
      })

      sub.on('error', (err) => {
        logger.error(`PubSub subscriber error for ${connId}:`, err)
      })
    }
    return sub
  }
}
