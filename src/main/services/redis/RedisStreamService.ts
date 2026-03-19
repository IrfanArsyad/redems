import Redis from 'ioredis'
import type {
  RedisStreamEntry,
  RedisStreamInfo,
  RedisConsumerGroup,
  RedisConsumer,
  RedisPendingEntry
} from '@shared/types/redis.types'

export class RedisStreamService {
  async xrange(
    redis: Redis,
    key: string,
    start: string,
    end: string,
    count?: number
  ): Promise<RedisStreamEntry[]> {
    let result: [string, string[]][]
    if (count) {
      result = (await redis.xrange(key, start, end, 'COUNT', count)) as any
    } else {
      result = (await redis.xrange(key, start, end)) as any
    }
    return this.parseEntries(result)
  }

  async xrevrange(
    redis: Redis,
    key: string,
    end: string,
    start: string,
    count?: number
  ): Promise<RedisStreamEntry[]> {
    let result: [string, string[]][]
    if (count) {
      result = (await redis.xrevrange(key, end, start, 'COUNT', count)) as any
    } else {
      result = (await redis.xrevrange(key, end, start)) as any
    }
    return this.parseEntries(result)
  }

  async xadd(
    redis: Redis,
    key: string,
    id: string,
    fields: Record<string, string>
  ): Promise<string> {
    const args: string[] = []
    for (const [k, v] of Object.entries(fields)) {
      args.push(k, v)
    }
    return redis.xadd(key, id === '*' ? '*' : id, ...args) as Promise<string>
  }

  async xdel(redis: Redis, key: string, ids: string[]): Promise<number> {
    return redis.xdel(key, ...ids)
  }

  async xtrim(
    redis: Redis,
    key: string,
    strategy: 'MAXLEN' | 'MINID',
    threshold: number
  ): Promise<number> {
    return redis.call('XTRIM', key, strategy, threshold.toString()) as Promise<number>
  }

  async xlen(redis: Redis, key: string): Promise<number> {
    return redis.xlen(key)
  }

  async xinfo(redis: Redis, key: string): Promise<RedisStreamInfo> {
    const raw = (await redis.xinfo('STREAM', key)) as any[]
    const obj: Record<string, any> = {}
    for (let i = 0; i < raw.length; i += 2) {
      obj[raw[i]] = raw[i + 1]
    }
    return {
      length: obj['length'] ?? 0,
      groups: obj['groups'] ?? 0,
      radixTreeKeys: obj['radix-tree-keys'] ?? 0,
      radixTreeNodes: obj['radix-tree-nodes'] ?? 0,
      lastGeneratedId: obj['last-generated-id'] ?? '0-0'
    }
  }

  async getGroups(redis: Redis, key: string): Promise<RedisConsumerGroup[]> {
    try {
      const groups = (await redis.xinfo('GROUPS', key)) as any[]
      return groups.map((g: any[]) => {
        const obj: Record<string, any> = {}
        for (let i = 0; i < g.length; i += 2) obj[g[i]] = g[i + 1]
        return {
          name: obj['name'],
          consumers: obj['consumers'] ?? 0,
          pending: obj['pending'] ?? 0,
          lastDeliveredId: obj['last-delivered-id'] ?? '0-0'
        }
      })
    } catch {
      return []
    }
  }

  async getConsumers(redis: Redis, key: string, group: string): Promise<RedisConsumer[]> {
    const consumers = (await redis.xinfo('CONSUMERS', key, group)) as any[]
    return consumers.map((c: any[]) => {
      const obj: Record<string, any> = {}
      for (let i = 0; i < c.length; i += 2) obj[c[i]] = c[i + 1]
      return {
        name: obj['name'],
        pending: obj['pending'] ?? 0,
        idle: obj['idle'] ?? 0
      }
    })
  }

  async getPending(
    redis: Redis,
    key: string,
    group: string,
    start: string,
    end: string,
    count: number
  ): Promise<RedisPendingEntry[]> {
    const result = (await redis.xpending(key, group, start, end, count)) as any[]
    return result.map((entry: any[]) => ({
      id: entry[0],
      consumer: entry[1],
      idleTime: entry[2],
      deliveryCount: entry[3]
    }))
  }

  async createGroup(redis: Redis, key: string, group: string, id: string): Promise<void> {
    await (redis as any).xgroup('CREATE', key, group, id, 'MKSTREAM')
  }

  async destroyGroup(redis: Redis, key: string, group: string): Promise<void> {
    await (redis as any).xgroup('DESTROY', key, group)
  }

  async ack(redis: Redis, key: string, group: string, ids: string[]): Promise<number> {
    return redis.xack(key, group, ...ids)
  }

  private parseEntries(raw: [string, string[]][]): RedisStreamEntry[] {
    return raw.map(([id, fields]) => {
      const fieldMap: Record<string, string> = {}
      for (let i = 0; i < fields.length; i += 2) {
        fieldMap[fields[i]] = fields[i + 1]
      }
      return { id, fields: fieldMap }
    })
  }
}
