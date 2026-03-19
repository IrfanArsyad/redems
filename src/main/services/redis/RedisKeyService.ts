import type Redis from 'ioredis'
import type { Cluster } from 'ioredis'
import type { RedisKeyInfo, RedisScanResult, RedisDataType } from '@shared/types/redis.types'

type RedisClient = Redis | Cluster

export class RedisKeyService {
  /**
   * Scan keys matching a pattern with optional type filter.
   * For each discovered key, pipelines TYPE and TTL commands.
   */
  async scan(
    redis: RedisClient,
    pattern: string,
    cursor: string,
    count: number,
    type?: string
  ): Promise<RedisScanResult> {
    // Build SCAN arguments
    const args: (string | number)[] = [cursor, 'MATCH', pattern, 'COUNT', count]
    if (type) {
      args.push('TYPE', type)
    }

    const [nextCursor, rawKeys] = (await redis.call('SCAN', ...args)) as [string, string[]]

    if (rawKeys.length === 0) {
      return { cursor: nextCursor, keys: [] }
    }

    // Pipeline TYPE and TTL for all keys at once
    const pipeline = redis.pipeline()
    for (const key of rawKeys) {
      pipeline.type(key)
      pipeline.ttl(key)
    }

    const results = await pipeline.exec()
    if (!results) {
      return { cursor: nextCursor, keys: [] }
    }

    const keys: RedisKeyInfo[] = []
    for (let i = 0; i < rawKeys.length; i++) {
      const typeResult = results[i * 2]
      const ttlResult = results[i * 2 + 1]

      const keyType = typeResult && !typeResult[0] ? (typeResult[1] as string) : 'unknown'
      const keyTtl = ttlResult && !ttlResult[0] ? (ttlResult[1] as number) : -1

      keys.push({
        key: rawKeys[i],
        type: keyType as RedisDataType,
        ttl: keyTtl
      })
    }

    return { cursor: nextCursor, keys }
  }

  /**
   * Get detailed information about a specific key.
   */
  async getKeyInfo(redis: RedisClient, key: string): Promise<RedisKeyInfo> {
    const pipeline = redis.pipeline()
    pipeline.type(key)
    pipeline.ttl(key)
    pipeline.call('MEMORY', 'USAGE', key)
    pipeline.call('OBJECT', 'ENCODING', key)

    const results = await pipeline.exec()
    if (!results) {
      throw new Error(`Failed to get info for key: ${key}`)
    }

    const [typeRes, ttlRes, memRes, encRes] = results

    const keyType = typeRes && !typeRes[0] ? (typeRes[1] as string) : 'unknown'
    const ttl = ttlRes && !ttlRes[0] ? (ttlRes[1] as number) : -1
    const memoryUsage = memRes && !memRes[0] ? (memRes[1] as number) : undefined
    const encoding = encRes && !encRes[0] ? (encRes[1] as string) : undefined

    return {
      key,
      type: keyType as RedisDataType,
      ttl,
      memoryUsage: memoryUsage ?? undefined,
      encoding: encoding ?? undefined
    }
  }

  /**
   * Delete one or more keys using a pipeline.
   */
  async deleteKeys(redis: RedisClient, keys: string[]): Promise<number> {
    if (keys.length === 0) return 0

    const pipeline = redis.pipeline()
    for (const key of keys) {
      pipeline.del(key)
    }

    const results = await pipeline.exec()
    if (!results) return 0

    let deleted = 0
    for (const [err, result] of results) {
      if (!err && result) {
        deleted += result as number
      }
    }

    return deleted
  }

  /**
   * Rename a key.
   */
  async renameKey(redis: RedisClient, oldKey: string, newKey: string): Promise<void> {
    await redis.rename(oldKey, newKey)
  }

  /**
   * Set a TTL (in seconds) on a key.
   */
  async setExpiry(redis: RedisClient, key: string, ttl: number): Promise<void> {
    await redis.expire(key, ttl)
  }

  /**
   * Remove the TTL from a key, making it persistent.
   */
  async persist(redis: RedisClient, key: string): Promise<void> {
    await redis.persist(key)
  }

  /**
   * Create a new key with an initial value. Supports all standard Redis data types.
   * Optionally sets a TTL in seconds.
   */
  async createKey(
    redis: RedisClient,
    key: string,
    type: RedisDataType,
    value: unknown,
    ttl?: number
  ): Promise<void> {
    switch (type) {
      case 'string': {
        await redis.set(key, value as string)
        break
      }
      case 'hash': {
        const hashValue = value as Record<string, string>
        const entries = Object.entries(hashValue)
        if (entries.length > 0) {
          const args: string[] = []
          for (const [field, val] of entries) {
            args.push(field, val)
          }
          await redis.hset(key, ...args)
        }
        break
      }
      case 'list': {
        const listValue = value as string[]
        if (listValue.length > 0) {
          await redis.rpush(key, ...listValue)
        }
        break
      }
      case 'set': {
        const setValue = value as string[]
        if (setValue.length > 0) {
          await redis.sadd(key, ...setValue)
        }
        break
      }
      case 'zset': {
        const zsetValue = value as Array<{ score: number; value: string }>
        if (zsetValue.length > 0) {
          const args: (string | number)[] = []
          for (const member of zsetValue) {
            args.push(member.score, member.value)
          }
          await (redis as Redis).zadd(key, ...args as [number, string])
        }
        break
      }
      case 'stream': {
        const streamValue = value as Record<string, string>
        const fields: string[] = []
        for (const [field, val] of Object.entries(streamValue)) {
          fields.push(field, val)
        }
        if (fields.length > 0) {
          await redis.xadd(key, '*', ...fields)
        }
        break
      }
      case 'json': {
        // Requires RedisJSON module
        const jsonString = typeof value === 'string' ? value : JSON.stringify(value)
        await redis.call('JSON.SET', key, '$', jsonString)
        break
      }
      default:
        throw new Error(`Unsupported key type: ${type}`)
    }

    // Set expiry if provided
    if (ttl && ttl > 0) {
      await redis.expire(key, ttl)
    }
  }
}
