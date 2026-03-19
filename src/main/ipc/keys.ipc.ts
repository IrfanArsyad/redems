import { ipcMain } from 'electron'
import type { IpcServices } from './index'
import type { RedisDataType } from '@shared/types/redis.types'

export function registerKeysHandlers(services: IpcServices): void {
  const { connectionManager, keyService } = services

  const getRedis = (connId: string) => {
    const redis = connectionManager.getConnection(connId)
    if (!redis) throw new Error(`No active connection: ${connId}`)
    return redis
  }

  // Key browsing
  ipcMain.handle(
    'keys:scan',
    (_e, connId: string, pattern: string, cursor: string, count: number, type?: string) => {
      return keyService.scan(getRedis(connId), pattern, cursor, count, type)
    }
  )

  ipcMain.handle('keys:info', (_e, connId: string, key: string) => {
    return keyService.getKeyInfo(getRedis(connId), key)
  })

  ipcMain.handle('keys:delete', (_e, connId: string, keys: string[]) => {
    return keyService.deleteKeys(getRedis(connId), keys)
  })

  ipcMain.handle('keys:rename', (_e, connId: string, oldKey: string, newKey: string) => {
    return keyService.renameKey(getRedis(connId), oldKey, newKey)
  })

  ipcMain.handle('keys:expire', (_e, connId: string, key: string, ttl: number) => {
    return keyService.setExpiry(getRedis(connId), key, ttl)
  })

  ipcMain.handle('keys:persist', (_e, connId: string, key: string) => {
    return keyService.persist(getRedis(connId), key)
  })

  ipcMain.handle('keys:type', async (_e, connId: string, key: string) => {
    return getRedis(connId).type(key)
  })

  ipcMain.handle('keys:exists', async (_e, connId: string, key: string) => {
    return (await getRedis(connId).exists(key)) === 1
  })

  ipcMain.handle(
    'keys:create',
    (_e, connId: string, key: string, type: RedisDataType, value: unknown, ttl?: number) => {
      return keyService.createKey(getRedis(connId), key, type, value, ttl)
    }
  )

  // String
  ipcMain.handle('string:get', (_e, connId: string, key: string) => {
    return getRedis(connId).get(key)
  })

  ipcMain.handle('string:set', async (_e, connId: string, key: string, value: string, ttl?: number) => {
    if (ttl && ttl > 0) {
      await getRedis(connId).set(key, value, 'EX', ttl)
    } else {
      await getRedis(connId).set(key, value)
    }
  })

  // Hash
  ipcMain.handle('hash:getall', async (_e, connId: string, key: string) => {
    const result = await getRedis(connId).hgetall(key)
    return Object.entries(result).map(([field, value]) => ({ field, value }))
  })

  ipcMain.handle(
    'hash:hscan',
    async (_e, connId: string, key: string, cursor: string, pattern: string, count: number) => {
      const [newCursor, data] = await getRedis(connId).hscan(key, cursor, 'MATCH', pattern, 'COUNT', count)
      const fields: Array<{ field: string; value: string }> = []
      for (let i = 0; i < data.length; i += 2) {
        fields.push({ field: data[i], value: data[i + 1] })
      }
      return { cursor: newCursor, fields }
    }
  )

  ipcMain.handle('hash:hset', (_e, connId: string, key: string, field: string, value: string) => {
    return getRedis(connId).hset(key, field, value)
  })

  ipcMain.handle('hash:hdel', (_e, connId: string, key: string, fields: string[]) => {
    return getRedis(connId).hdel(key, ...fields)
  })

  // List
  ipcMain.handle(
    'list:lrange',
    async (_e, connId: string, key: string, start: number, stop: number) => {
      const values = await getRedis(connId).lrange(key, start, stop)
      return values.map((value, i) => ({ index: start + i, value }))
    }
  )

  ipcMain.handle('list:lset', (_e, connId: string, key: string, index: number, value: string) => {
    return getRedis(connId).lset(key, index, value)
  })

  ipcMain.handle('list:lpush', (_e, connId: string, key: string, values: string[]) => {
    return getRedis(connId).lpush(key, ...values)
  })

  ipcMain.handle('list:rpush', (_e, connId: string, key: string, values: string[]) => {
    return getRedis(connId).rpush(key, ...values)
  })

  ipcMain.handle('list:lpop', async (_e, connId: string, key: string, count?: number) => {
    if (count && count > 1) {
      const result = await getRedis(connId).lpop(key, count)
      return result ?? []
    }
    const val = await getRedis(connId).lpop(key)
    return val ? [val] : []
  })

  ipcMain.handle('list:rpop', async (_e, connId: string, key: string, count?: number) => {
    if (count && count > 1) {
      const result = await getRedis(connId).rpop(key, count)
      return result ?? []
    }
    const val = await getRedis(connId).rpop(key)
    return val ? [val] : []
  })

  ipcMain.handle('list:lrem', (_e, connId: string, key: string, count: number, value: string) => {
    return getRedis(connId).lrem(key, count, value)
  })

  ipcMain.handle('list:llen', (_e, connId: string, key: string) => {
    return getRedis(connId).llen(key)
  })

  // Set
  ipcMain.handle('set:smembers', (_e, connId: string, key: string) => {
    return getRedis(connId).smembers(key)
  })

  ipcMain.handle(
    'set:sscan',
    async (_e, connId: string, key: string, cursor: string, pattern: string, count: number) => {
      const [newCursor, members] = await getRedis(connId).sscan(key, cursor, 'MATCH', pattern, 'COUNT', count)
      return { cursor: newCursor, members }
    }
  )

  ipcMain.handle('set:sadd', (_e, connId: string, key: string, members: string[]) => {
    return getRedis(connId).sadd(key, ...members)
  })

  ipcMain.handle('set:srem', (_e, connId: string, key: string, members: string[]) => {
    return getRedis(connId).srem(key, ...members)
  })

  ipcMain.handle('set:scard', (_e, connId: string, key: string) => {
    return getRedis(connId).scard(key)
  })

  // Sorted Set
  ipcMain.handle(
    'zset:zrange',
    async (_e, connId: string, key: string, start: number, stop: number, withScores: boolean) => {
      if (withScores) {
        const result = await getRedis(connId).zrange(key, start, stop, 'WITHSCORES')
        const members: Array<{ value: string; score: number }> = []
        for (let i = 0; i < result.length; i += 2) {
          members.push({ value: result[i], score: parseFloat(result[i + 1]) })
        }
        return members
      }
      const values = await getRedis(connId).zrange(key, start, stop)
      return values.map((value) => ({ value, score: 0 }))
    }
  )

  ipcMain.handle(
    'zset:zscan',
    async (_e, connId: string, key: string, cursor: string, pattern: string, count: number) => {
      const [newCursor, data] = await getRedis(connId).zscan(key, cursor, 'MATCH', pattern, 'COUNT', count)
      const members: Array<{ value: string; score: number }> = []
      for (let i = 0; i < data.length; i += 2) {
        members.push({ value: data[i], score: parseFloat(data[i + 1]) })
      }
      return { cursor: newCursor, members }
    }
  )

  ipcMain.handle(
    'zset:zadd',
    (_e, connId: string, key: string, members: Array<{ score: number; value: string }>) => {
      const args: (string | number)[] = []
      for (const m of members) {
        args.push(m.score, m.value)
      }
      return (getRedis(connId) as any).zadd(key, ...args)
    }
  )

  ipcMain.handle('zset:zrem', (_e, connId: string, key: string, members: string[]) => {
    return getRedis(connId).zrem(key, ...members)
  })

  ipcMain.handle(
    'zset:zincrby',
    (_e, connId: string, key: string, member: string, increment: number) => {
      return getRedis(connId).zincrby(key, increment, member)
    }
  )

  ipcMain.handle('zset:zcard', (_e, connId: string, key: string) => {
    return getRedis(connId).zcard(key)
  })

  // Stream
  ipcMain.handle(
    'stream:xrange',
    async (_e, connId: string, key: string, start: string, end: string, count?: number) => {
      const args: [string, string, string] = [key, start, end]
      let result: [string, string[]][]
      if (count) {
        result = (await getRedis(connId).xrange(key, start, end, 'COUNT', count)) as any
      } else {
        result = (await getRedis(connId).xrange(...args)) as any
      }
      return result.map(([id, fields]) => {
        const fieldMap: Record<string, string> = {}
        for (let i = 0; i < fields.length; i += 2) {
          fieldMap[fields[i]] = fields[i + 1]
        }
        return { id, fields: fieldMap }
      })
    }
  )

  ipcMain.handle(
    'stream:xrevrange',
    async (_e, connId: string, key: string, end: string, start: string, count?: number) => {
      let result: [string, string[]][]
      if (count) {
        result = (await getRedis(connId).xrevrange(key, end, start, 'COUNT', count)) as any
      } else {
        result = (await getRedis(connId).xrevrange(key, end, start)) as any
      }
      return result.map(([id, fields]) => {
        const fieldMap: Record<string, string> = {}
        for (let i = 0; i < fields.length; i += 2) {
          fieldMap[fields[i]] = fields[i + 1]
        }
        return { id, fields: fieldMap }
      })
    }
  )

  ipcMain.handle(
    'stream:xadd',
    async (_e, connId: string, key: string, id: string, fields: Record<string, string>) => {
      const args: string[] = []
      for (const [k, v] of Object.entries(fields)) {
        args.push(k, v)
      }
      return getRedis(connId).xadd(key, id === '*' ? '*' : id, ...args)
    }
  )

  ipcMain.handle('stream:xdel', (_e, connId: string, key: string, ids: string[]) => {
    return getRedis(connId).xdel(key, ...ids)
  })

  ipcMain.handle(
    'stream:xtrim',
    (_e, connId: string, key: string, strategy: 'MAXLEN' | 'MINID', threshold: number) => {
      return getRedis(connId).call('XTRIM', key, strategy, threshold.toString()) as Promise<number>
    }
  )

  ipcMain.handle('stream:xlen', (_e, connId: string, key: string) => {
    return getRedis(connId).xlen(key)
  })

  ipcMain.handle('stream:xinfo', async (_e, connId: string, key: string) => {
    const info = (await getRedis(connId).xinfo('STREAM', key)) as any[]
    const result: Record<string, any> = {}
    for (let i = 0; i < info.length; i += 2) {
      result[info[i]] = info[i + 1]
    }
    return {
      length: result['length'] ?? 0,
      groups: result['groups'] ?? 0,
      radixTreeKeys: result['radix-tree-keys'] ?? 0,
      radixTreeNodes: result['radix-tree-nodes'] ?? 0,
      lastGeneratedId: result['last-generated-id'] ?? '0-0'
    }
  })

  ipcMain.handle('stream:groups', async (_e, connId: string, key: string) => {
    try {
      const groups = (await getRedis(connId).xinfo('GROUPS', key)) as any[]
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
  })

  ipcMain.handle('stream:consumers', async (_e, connId: string, key: string, group: string) => {
    const consumers = (await getRedis(connId).xinfo('CONSUMERS', key, group)) as any[]
    return consumers.map((c: any[]) => {
      const obj: Record<string, any> = {}
      for (let i = 0; i < c.length; i += 2) obj[c[i]] = c[i + 1]
      return {
        name: obj['name'],
        pending: obj['pending'] ?? 0,
        idle: obj['idle'] ?? 0
      }
    })
  })

  ipcMain.handle(
    'stream:pending',
    async (
      _e,
      connId: string,
      key: string,
      group: string,
      start: string,
      end: string,
      count: number
    ) => {
      const result = (await getRedis(connId).xpending(key, group, start, end, count)) as any[]
      return result.map((entry: any[]) => ({
        id: entry[0],
        consumer: entry[1],
        idleTime: entry[2],
        deliveryCount: entry[3]
      }))
    }
  )

  ipcMain.handle(
    'stream:group-create',
    (_e, connId: string, key: string, group: string, id: string) => {
      return (getRedis(connId) as any).xgroup('CREATE', key, group, id, 'MKSTREAM')
    }
  )

  ipcMain.handle('stream:group-destroy', (_e, connId: string, key: string, group: string) => {
    return (getRedis(connId) as any).xgroup('DESTROY', key, group)
  })

  ipcMain.handle(
    'stream:xack',
    (_e, connId: string, key: string, group: string, ids: string[]) => {
      return getRedis(connId).xack(key, group, ...ids)
    }
  )
}
