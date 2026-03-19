import type Redis from 'ioredis'
import type { Cluster } from 'ioredis'
import type {
  RedisServerInfo,
  RedisClientInfo,
  RedisSlowLogEntry
} from '@shared/types/redis.types'

type RedisClient = Redis | Cluster

export class RedisServerService {
  /**
   * Execute INFO command and parse all sections into a structured RedisServerInfo object.
   */
  async getInfo(redis: RedisClient): Promise<RedisServerInfo> {
    const rawInfo = await redis.info()
    const raw = this.parseInfoSections(rawInfo)

    const server = raw['Server'] || raw['server'] || {}
    const clients = raw['Clients'] || raw['clients'] || {}
    const memory = raw['Memory'] || raw['memory'] || {}
    const stats = raw['Stats'] || raw['stats'] || {}
    const replication = raw['Replication'] || raw['replication'] || {}
    const persistence = raw['Persistence'] || raw['persistence'] || {}
    const keyspace = raw['Keyspace'] || raw['keyspace'] || {}

    // Parse database info from keyspace section
    const databases: Record<string, { keys: number; expires: number; avgTtl: number }> = {}
    for (const [dbName, dbInfo] of Object.entries(keyspace)) {
      if (dbName.startsWith('db')) {
        const parsed = this.parseDbInfo(dbInfo)
        if (parsed) {
          databases[dbName] = parsed
        }
      }
    }

    const keyspaceHits = parseInt(stats['keyspace_hits'] || '0', 10)
    const keyspaceMisses = parseInt(stats['keyspace_misses'] || '0', 10)
    const totalAccesses = keyspaceHits + keyspaceMisses
    const hitRate = totalAccesses > 0 ? keyspaceHits / totalAccesses : 0

    return {
      version: server['redis_version'] || 'unknown',
      mode: server['redis_mode'] || 'standalone',
      os: server['os'] || 'unknown',
      uptimeInSeconds: parseInt(server['uptime_in_seconds'] || '0', 10),
      uptimeInDays: parseInt(server['uptime_in_days'] || '0', 10),
      connectedClients: parseInt(clients['connected_clients'] || '0', 10),
      blockedClients: parseInt(clients['blocked_clients'] || '0', 10),
      usedMemory: memory['used_memory_human'] || '0B',
      usedMemoryPeak: memory['used_memory_peak_human'] || '0B',
      usedMemoryRss: memory['used_memory_rss_human'] || '0B',
      totalSystemMemory: memory['total_system_memory_human'] || '0B',
      memFragmentationRatio: parseFloat(memory['mem_fragmentation_ratio'] || '0'),
      totalConnectionsReceived: parseInt(stats['total_connections_received'] || '0', 10),
      totalCommandsProcessed: parseInt(stats['total_commands_processed'] || '0', 10),
      instantaneousOpsPerSec: parseInt(stats['instantaneous_ops_per_sec'] || '0', 10),
      keyspaceHits,
      keyspaceMisses,
      hitRate,
      role: replication['role'] || 'master',
      connectedSlaves: parseInt(replication['connected_slaves'] || '0', 10),
      rdbLastSaveTime: parseInt(persistence['rdb_last_save_time'] || '0', 10),
      aofEnabled: persistence['aof_enabled'] === '1',
      databases,
      raw
    }
  }

  /**
   * Execute CONFIG GET with the given pattern.
   * Returns key-value pairs of matching config entries.
   */
  async getConfig(redis: RedisClient, pattern: string): Promise<Record<string, string>> {
    const result = await redis.config('GET', pattern)

    // ioredis returns either an array of [key, value, ...] or an object
    if (Array.isArray(result)) {
      const config: Record<string, string> = {}
      for (let i = 0; i < result.length; i += 2) {
        config[result[i]] = result[i + 1]
      }
      return config
    }

    // Some ioredis versions return an object directly
    return result as unknown as Record<string, string>
  }

  /**
   * Set a configuration parameter.
   */
  async setConfig(redis: RedisClient, key: string, value: string): Promise<void> {
    await redis.config('SET', key, value)
  }

  /**
   * Execute CLIENT LIST and parse each client entry.
   */
  async getClients(redis: RedisClient): Promise<RedisClientInfo[]> {
    const raw = await redis.client('LIST') as string
    return this.parseClientList(raw)
  }

  /**
   * Kill a client connection by address.
   */
  async killClient(redis: RedisClient, addr: string): Promise<void> {
    await redis.client('KILL', 'ADDR', addr)
  }

  /**
   * Get the slow log entries.
   */
  async getSlowLog(redis: RedisClient, count: number = 10): Promise<RedisSlowLogEntry[]> {
    const raw = (await redis.call('SLOWLOG', 'GET', count)) as unknown[][]

    if (!Array.isArray(raw)) return []

    return raw.map((entry) => {
      const [id, timestamp, duration, args, clientAddr, clientName] = entry as [
        number,
        number,
        number,
        string[],
        string?,
        string?
      ]

      return {
        id: Number(id),
        timestamp: Number(timestamp),
        duration: Number(duration),
        args: Array.isArray(args) ? args.map(String) : [],
        clientAddr: clientAddr ? String(clientAddr) : '',
        clientName: clientName ? String(clientName) : ''
      }
    })
  }

  /**
   * Get the number of keys in the current database.
   */
  async getDbSize(redis: RedisClient): Promise<number> {
    return await redis.dbsize()
  }

  /**
   * Flush the current database. Optionally execute asynchronously.
   */
  async flushDb(redis: RedisClient, async: boolean = false): Promise<void> {
    if (async) {
      await redis.call('FLUSHDB', 'ASYNC')
    } else {
      await redis.call('FLUSHDB')
    }
  }

  /**
   * Select a specific database by index.
   */
  async selectDb(redis: RedisClient, db: number): Promise<void> {
    await (redis as Redis).select(db)
  }

  // ─── Private helpers ───────────────────────────────────────────────

  /**
   * Parse the raw INFO response into a map of section -> key-value pairs.
   */
  private parseInfoSections(raw: string): Record<string, Record<string, string>> {
    const sections: Record<string, Record<string, string>> = {}
    let currentSection = 'General'

    const lines = raw.split('\r\n').length > 1 ? raw.split('\r\n') : raw.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed || trimmed === '') continue

      // Section header
      if (trimmed.startsWith('#')) {
        currentSection = trimmed.replace(/^#\s*/, '').trim()
        if (!sections[currentSection]) {
          sections[currentSection] = {}
        }
        continue
      }

      // Key-value pair
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex)
        const value = trimmed.substring(colonIndex + 1)
        if (!sections[currentSection]) {
          sections[currentSection] = {}
        }
        sections[currentSection][key] = value
      }
    }

    return sections
  }

  /**
   * Parse a keyspace db info string like "keys=10,expires=2,avg_ttl=5000"
   */
  private parseDbInfo(
    info: string
  ): { keys: number; expires: number; avgTtl: number } | null {
    const parts: Record<string, string> = {}
    for (const pair of info.split(',')) {
      const [key, value] = pair.split('=')
      if (key && value) {
        parts[key.trim()] = value.trim()
      }
    }

    if (!parts['keys']) return null

    return {
      keys: parseInt(parts['keys'], 10) || 0,
      expires: parseInt(parts['expires'], 10) || 0,
      avgTtl: parseInt(parts['avg_ttl'], 10) || 0
    }
  }

  /**
   * Parse the CLIENT LIST response into RedisClientInfo objects.
   * Each client is on a separate line, fields separated by spaces as key=value pairs.
   */
  private parseClientList(raw: string): RedisClientInfo[] {
    const lines = raw.split('\n').filter((line) => line.trim().length > 0)
    return lines.map((line) => this.parseClientLine(line))
  }

  private parseClientLine(line: string): RedisClientInfo {
    const fields: Record<string, string> = {}
    const parts = line.trim().split(' ')

    for (const part of parts) {
      const eqIndex = part.indexOf('=')
      if (eqIndex > 0) {
        const key = part.substring(0, eqIndex)
        const value = part.substring(eqIndex + 1)
        fields[key] = value
      }
    }

    return {
      id: fields['id'] || '',
      addr: fields['addr'] || '',
      fd: fields['fd'] || '',
      name: fields['name'] || '',
      db: parseInt(fields['db'] || '0', 10),
      cmd: fields['cmd'] || '',
      age: parseInt(fields['age'] || '0', 10),
      idle: parseInt(fields['idle'] || '0', 10),
      flags: fields['flags'] || '',
      sub: parseInt(fields['sub'] || '0', 10),
      psub: parseInt(fields['psub'] || '0', 10),
      multi: parseInt(fields['multi'] || '-1', 10),
      qbuf: parseInt(fields['qbuf'] || '0', 10),
      qbufFree: parseInt(fields['qbuf-free'] || '0', 10),
      obl: parseInt(fields['obl'] || '0', 10),
      oll: parseInt(fields['oll'] || '0', 10),
      omem: parseInt(fields['omem'] || '0', 10),
      events: fields['events'] || ''
    }
  }
}
