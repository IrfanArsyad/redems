import type { ConnectionConfig, ConnectionState } from './connection.types'
import type {
  RedisKeyInfo,
  RedisScanResult,
  RedisHashField,
  RedisListItem,
  RedisZSetMember,
  RedisStreamEntry,
  RedisStreamInfo,
  RedisConsumerGroup,
  RedisConsumer,
  RedisPendingEntry,
  RedisServerInfo,
  RedisClientInfo,
  RedisSlowLogEntry,
  RedisClusterInfo,
  MonitorEntry,
  PubSubMessage,
  MemoryAnalysisResult,
  ImportExportOptions,
  RedisDataType
} from './redis.types'

// ── Request-Response (invoke/handle) ──────────────────────────────────

export interface IpcInvokeChannelMap {
  // Connection
  'connection:list': { args: []; return: ConnectionConfig[] }
  'connection:create': { args: [config: ConnectionConfig]; return: void }
  'connection:update': { args: [config: ConnectionConfig]; return: void }
  'connection:delete': { args: [id: string]; return: void }
  'connection:connect': { args: [id: string]; return: ConnectionState }
  'connection:disconnect': { args: [id: string]; return: void }
  'connection:test': {
    args: [config: ConnectionConfig]
    return: { success: boolean; message: string; latency?: number }
  }

  // Keys
  'keys:scan': {
    args: [connId: string, pattern: string, cursor: string, count: number, type?: string]
    return: RedisScanResult
  }
  'keys:info': { args: [connId: string, key: string]; return: RedisKeyInfo }
  'keys:delete': { args: [connId: string, keys: string[]]; return: number }
  'keys:rename': { args: [connId: string, oldKey: string, newKey: string]; return: void }
  'keys:expire': { args: [connId: string, key: string, ttl: number]; return: void }
  'keys:persist': { args: [connId: string, key: string]; return: void }
  'keys:type': { args: [connId: string, key: string]; return: string }
  'keys:exists': { args: [connId: string, key: string]; return: boolean }
  'keys:dump-restore': {
    args: [
      sourceConnId: string,
      targetConnId: string,
      keys: string[],
      replace: boolean
    ]
    return: { success: number; failed: number }
  }

  // String
  'string:get': { args: [connId: string, key: string]; return: string | null }
  'string:set': { args: [connId: string, key: string, value: string, ttl?: number]; return: void }

  // Hash
  'hash:getall': { args: [connId: string, key: string]; return: RedisHashField[] }
  'hash:hscan': {
    args: [connId: string, key: string, cursor: string, pattern: string, count: number]
    return: { cursor: string; fields: RedisHashField[] }
  }
  'hash:hset': { args: [connId: string, key: string, field: string, value: string]; return: void }
  'hash:hdel': { args: [connId: string, key: string, fields: string[]]; return: number }

  // List
  'list:lrange': {
    args: [connId: string, key: string, start: number, stop: number]
    return: RedisListItem[]
  }
  'list:lset': { args: [connId: string, key: string, index: number, value: string]; return: void }
  'list:lpush': { args: [connId: string, key: string, values: string[]]; return: number }
  'list:rpush': { args: [connId: string, key: string, values: string[]]; return: number }
  'list:lpop': { args: [connId: string, key: string, count?: number]; return: string[] }
  'list:rpop': { args: [connId: string, key: string, count?: number]; return: string[] }
  'list:lrem': { args: [connId: string, key: string, count: number, value: string]; return: number }
  'list:llen': { args: [connId: string, key: string]; return: number }

  // Set
  'set:smembers': { args: [connId: string, key: string]; return: string[] }
  'set:sscan': {
    args: [connId: string, key: string, cursor: string, pattern: string, count: number]
    return: { cursor: string; members: string[] }
  }
  'set:sadd': { args: [connId: string, key: string, members: string[]]; return: number }
  'set:srem': { args: [connId: string, key: string, members: string[]]; return: number }
  'set:scard': { args: [connId: string, key: string]; return: number }

  // Sorted Set
  'zset:zrange': {
    args: [connId: string, key: string, start: number, stop: number, withScores: boolean]
    return: RedisZSetMember[]
  }
  'zset:zscan': {
    args: [connId: string, key: string, cursor: string, pattern: string, count: number]
    return: { cursor: string; members: RedisZSetMember[] }
  }
  'zset:zadd': {
    args: [connId: string, key: string, members: Array<{ score: number; value: string }>]
    return: number
  }
  'zset:zrem': { args: [connId: string, key: string, members: string[]]; return: number }
  'zset:zincrby': {
    args: [connId: string, key: string, member: string, increment: number]
    return: string
  }
  'zset:zcard': { args: [connId: string, key: string]; return: number }

  // Stream
  'stream:xrange': {
    args: [connId: string, key: string, start: string, end: string, count?: number]
    return: RedisStreamEntry[]
  }
  'stream:xrevrange': {
    args: [connId: string, key: string, end: string, start: string, count?: number]
    return: RedisStreamEntry[]
  }
  'stream:xadd': {
    args: [connId: string, key: string, id: string, fields: Record<string, string>]
    return: string
  }
  'stream:xdel': { args: [connId: string, key: string, ids: string[]]; return: number }
  'stream:xtrim': {
    args: [connId: string, key: string, strategy: 'MAXLEN' | 'MINID', threshold: number]
    return: number
  }
  'stream:xlen': { args: [connId: string, key: string]; return: number }
  'stream:xinfo': { args: [connId: string, key: string]; return: RedisStreamInfo }
  'stream:groups': { args: [connId: string, key: string]; return: RedisConsumerGroup[] }
  'stream:consumers': {
    args: [connId: string, key: string, group: string]
    return: RedisConsumer[]
  }
  'stream:pending': {
    args: [connId: string, key: string, group: string, start: string, end: string, count: number]
    return: RedisPendingEntry[]
  }
  'stream:group-create': {
    args: [connId: string, key: string, group: string, id: string]
    return: void
  }
  'stream:group-destroy': { args: [connId: string, key: string, group: string]; return: void }
  'stream:xack': {
    args: [connId: string, key: string, group: string, ids: string[]]
    return: number
  }

  // CLI
  'cli:execute': { args: [connId: string, command: string]; return: unknown }

  // Server
  'server:info': { args: [connId: string]; return: RedisServerInfo }
  'server:config-get': {
    args: [connId: string, pattern: string]
    return: Record<string, string>
  }
  'server:config-set': {
    args: [connId: string, key: string, value: string]
    return: void
  }
  'server:clients': { args: [connId: string]; return: RedisClientInfo[] }
  'server:client-kill': { args: [connId: string, addr: string]; return: void }
  'server:slowlog': { args: [connId: string, count?: number]; return: RedisSlowLogEntry[] }
  'server:dbsize': { args: [connId: string]; return: number }
  'server:flushdb': { args: [connId: string, async?: boolean]; return: void }
  'server:select-db': { args: [connId: string, db: number]; return: void }

  // Cluster
  'cluster:info': { args: [connId: string]; return: RedisClusterInfo }
  'cluster:nodes': { args: [connId: string]; return: RedisClusterInfo['nodes'] }

  // PubSub
  'pubsub:subscribe': { args: [connId: string, channels: string[]]; return: void }
  'pubsub:psubscribe': { args: [connId: string, patterns: string[]]; return: void }
  'pubsub:unsubscribe': { args: [connId: string, channels: string[]]; return: void }
  'pubsub:punsubscribe': { args: [connId: string, patterns: string[]]; return: void }
  'pubsub:publish': {
    args: [connId: string, channel: string, message: string]
    return: number
  }

  // Monitor
  'monitor:start': { args: [connId: string]; return: void }
  'monitor:stop': { args: [connId: string]; return: void }

  // Memory
  'memory:analyze': {
    args: [connId: string, pattern: string, sampleSize: number]
    return: MemoryAnalysisResult
  }

  // Import/Export
  'export:keys': {
    args: [connId: string, keys: string[], options: ImportExportOptions]
    return: string
  }
  'import:file': { args: [connId: string]; return: { imported: number; errors: number } }

  // Table data export (save dialog + write file)
  'export:table-data': {
    args: [content: string, defaultName: string, format: 'csv' | 'json']
    return: string
  }

  // Window controls
  'window:minimize': { args: []; return: void }
  'window:maximize': { args: []; return: void }
  'window:close': { args: []; return: void }
  'window:is-maximized': { args: []; return: boolean }

  // Key creation
  'keys:create': {
    args: [connId: string, key: string, type: RedisDataType, value: unknown, ttl?: number]
    return: void
  }
}

// ── Events (send/on) ──────────────────────────────────────────────────

export interface IpcEventChannelMap {
  'connection:status': ConnectionState
  'monitor:data': MonitorEntry
  'pubsub:message': PubSubMessage
  'memory:progress': { scanned: number; total: number }
  'window:maximized-changed': boolean
}

// ── Utility types for type-safe IPC ───────────────────────────────────

export type IpcInvokeChannel = keyof IpcInvokeChannelMap
export type IpcEventChannel = keyof IpcEventChannelMap

export type IpcInvokeArgs<C extends IpcInvokeChannel> = IpcInvokeChannelMap[C]['args']
export type IpcInvokeReturn<C extends IpcInvokeChannel> = IpcInvokeChannelMap[C]['return']
export type IpcEventPayload<C extends IpcEventChannel> = IpcEventChannelMap[C]
