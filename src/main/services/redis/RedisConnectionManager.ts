import Redis, { Cluster } from 'ioredis'
import type { RedisOptions } from 'ioredis'
import type { ConnectionConfig, ConnectionState, ConnectionStatus } from '@shared/types/connection.types'
import type { SSHTunnelService } from '@main/services/ssh/SSHTunnelService'
import { logger } from '@main/utils/logger'

type StatusCallback = (state: ConnectionState) => void

export class RedisConnectionManager {
  private connections: Map<string, Redis | Cluster> = new Map()
  private sshTunnelService: SSHTunnelService
  private statusCallback: StatusCallback

  constructor(sshTunnelService: SSHTunnelService, statusCallback: StatusCallback) {
    this.sshTunnelService = sshTunnelService
    this.statusCallback = statusCallback
  }

  /**
   * Create and store a new Redis connection based on the provided config.
   * If SSH tunneling is enabled, an SSH tunnel is established first and
   * the Redis client connects through the local tunnel port.
   */
  async connect(config: ConnectionConfig): Promise<ConnectionState> {
    // Disconnect any existing connection with the same id
    if (this.connections.has(config.id)) {
      await this.disconnect(config.id)
    }

    this.emitStatus(config.id, 'connecting')

    try {
      // Set up SSH tunnel if needed
      let effectiveConfig = config
      if (config.ssh.enabled) {
        const tunnel = await this.sshTunnelService.createTunnel(
          config.id,
          config.ssh,
          config.host,
          config.port
        )
        // Override host/port to point at the local tunnel endpoint
        effectiveConfig = { ...config, host: '127.0.0.1', port: tunnel.localPort }
      }

      const redis = this.createClient(effectiveConfig)
      this.connections.set(config.id, redis)
      this.attachListeners(config.id, redis)

      // Wait for the connection to be ready
      await this.waitForReady(redis)

      // Gather initial info
      const info = await this.getQuickInfo(redis)

      const state: ConnectionState = {
        id: config.id,
        status: 'connected',
        serverVersion: info.version,
        usedMemory: info.usedMemory,
        connectedClients: info.connectedClients,
        dbSize: info.dbSize
      }

      this.emitStatus(config.id, 'connected', state)
      return state
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const state: ConnectionState = {
        id: config.id,
        status: 'error',
        error: message
      }
      this.emitStatus(config.id, 'error', state)
      // Clean up the failed connection and any SSH tunnel
      this.connections.delete(config.id)
      await this.sshTunnelService.closeTunnel(config.id)
      throw err
    }
  }

  /**
   * Gracefully disconnect a specific connection, including its SSH tunnel.
   */
  async disconnect(id: string): Promise<void> {
    const redis = this.connections.get(id)
    if (!redis) return

    try {
      redis.disconnect()
    } catch {
      // Ignore disconnect errors
    }

    this.connections.delete(id)

    // Close the SSH tunnel if one exists for this connection
    await this.sshTunnelService.closeTunnel(id)

    this.emitStatus(id, 'disconnected')
    logger.info(`Disconnected: ${id}`)
  }

  /**
   * Disconnect all active connections.
   */
  async disconnectAll(): Promise<void> {
    const ids = Array.from(this.connections.keys())
    for (const id of ids) {
      await this.disconnect(id)
    }
  }

  /**
   * Get the Redis instance for an existing connection. Throws if not found.
   */
  getConnection(id: string): Redis | Cluster {
    const redis = this.connections.get(id)
    if (!redis) {
      throw new Error(`No active connection with id: ${id}`)
    }
    return redis
  }

  /**
   * Test a connection without storing it. Measures latency and gathers basic server info.
   * If SSH tunneling is enabled, a temporary tunnel is created for the test and torn down afterward.
   */
  async testConnection(
    config: ConnectionConfig
  ): Promise<{ success: boolean; message: string; latency?: number }> {
    let redis: Redis | Cluster | null = null
    const testTunnelId = `__test_${config.id}_${Date.now()}`

    try {
      let effectiveConfig = config
      if (config.ssh.enabled) {
        const tunnel = await this.sshTunnelService.createTunnel(
          testTunnelId,
          config.ssh,
          config.host,
          config.port
        )
        effectiveConfig = { ...config, host: '127.0.0.1', port: tunnel.localPort }
      }

      redis = this.createClient(effectiveConfig)
      await this.waitForReady(redis)

      // Measure latency via PING
      const start = Date.now()
      await redis.ping()
      const latency = Date.now() - start

      // Get basic server info
      const infoRaw = await redis.info('server')
      const versionMatch = infoRaw.match(/redis_version:(\S+)/)
      const version = versionMatch ? versionMatch[1] : 'unknown'

      return {
        success: true,
        message: `Connected to Redis ${version}`,
        latency
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        message: `Connection failed: ${message}`
      }
    } finally {
      if (redis) {
        try {
          redis.disconnect()
        } catch {
          // Ignore
        }
      }
      // Always clean up the test tunnel
      await this.sshTunnelService.closeTunnel(testTunnelId)
    }
  }

  /**
   * Check whether a given connection exists and is connected.
   */
  hasConnection(id: string): boolean {
    return this.connections.has(id)
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private createClient(config: ConnectionConfig): Redis | Cluster {
    const baseOptions: Record<string, unknown> = {
      password: config.password || undefined,
      username: config.username || undefined,
      connectTimeout: config.connectTimeout || 10000,
      commandTimeout: config.commandTimeout || 5000,
      retryStrategy(times: number): number | null {
        if (times > 3) return null // stop retrying after 3 attempts
        return Math.min(times * 500, 3000) // exponential backoff: 500, 1000, 1500
      },
      enableReadyCheck: true,
      lazyConnect: true
    }

    // TLS / SSL options
    if (config.ssl.enabled) {
      const tls: Record<string, unknown> = {
        rejectUnauthorized: config.ssl.rejectUnauthorized
      }
      if (config.ssl.ca) tls.ca = config.ssl.ca
      if (config.ssl.cert) tls.cert = config.ssl.cert
      if (config.ssl.key) tls.key = config.ssl.key
      baseOptions.tls = tls
    }

    if (config.mode === 'cluster') {
      return this.createClusterClient(config, baseOptions)
    }

    if (config.mode === 'sentinel') {
      return this.createSentinelClient(config, baseOptions)
    }

    // Standalone
    return this.createStandaloneClient(config, baseOptions)
  }

  private createStandaloneClient(
    config: ConnectionConfig,
    baseOptions: Record<string, unknown>
  ): Redis {
    const redis = new Redis({
      host: config.host,
      port: config.port,
      db: config.db,
      readOnly: config.readOnly,
      ...baseOptions
    } as RedisOptions)

    return redis
  }

  private createClusterClient(
    config: ConnectionConfig,
    baseOptions: Record<string, unknown>
  ): Cluster {
    const cluster = new Redis.Cluster(
      [{ host: config.host, port: config.port }],
      {
        redisOptions: {
          password: config.password || undefined,
          username: config.username || undefined,
          connectTimeout: config.connectTimeout || 10000,
          commandTimeout: config.commandTimeout || 5000,
          tls: baseOptions.tls as RedisOptions['tls']
        },
        clusterRetryStrategy(times: number): number | null {
          if (times > 3) return null
          return Math.min(times * 500, 3000)
        },
        lazyConnect: true
      }
    )

    return cluster
  }

  private createSentinelClient(
    config: ConnectionConfig,
    baseOptions: Record<string, unknown>
  ): Redis {
    const sentinels = config.sentinel.sentinels.map((s) => ({
      host: s.host,
      port: s.port
    }))

    const redis = new Redis({
      sentinels,
      name: config.sentinel.masterName,
      sentinelPassword: config.sentinel.password || undefined,
      db: config.db,
      readOnly: config.readOnly,
      ...baseOptions
    } as RedisOptions)

    return redis
  }

  private waitForReady(redis: Redis | Cluster): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timed out'))
      }, 15000)

      redis.once('ready', () => {
        clearTimeout(timeout)
        resolve()
      })

      redis.once('error', (err: Error) => {
        clearTimeout(timeout)
        reject(err)
      })

      // Trigger connection since lazyConnect is used
      redis.connect().catch((err: Error) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
  }

  private attachListeners(id: string, redis: Redis | Cluster): void {
    redis.on('error', (err: Error) => {
      logger.error(`Redis connection error [${id}]:`, err.message)
      this.emitStatus(id, 'error', {
        id,
        status: 'error',
        error: err.message
      })
    })

    redis.on('close', () => {
      logger.info(`Redis connection closed [${id}]`)
    })

    redis.on('reconnecting', () => {
      logger.info(`Redis reconnecting [${id}]`)
      this.emitStatus(id, 'connecting')
    })

    redis.on('ready', () => {
      logger.info(`Redis ready [${id}]`)
    })
  }

  private async getQuickInfo(
    redis: Redis | Cluster
  ): Promise<{
    version: string
    usedMemory: string
    connectedClients: number
    dbSize: number
  }> {
    try {
      const infoRaw = await redis.info()
      const versionMatch = infoRaw.match(/redis_version:(\S+)/)
      const memMatch = infoRaw.match(/used_memory_human:(\S+)/)
      const clientsMatch = infoRaw.match(/connected_clients:(\d+)/)

      let dbSize = 0
      try {
        dbSize = await redis.dbsize()
      } catch {
        // DBSIZE may not be available on cluster
      }

      return {
        version: versionMatch ? versionMatch[1] : 'unknown',
        usedMemory: memMatch ? memMatch[1] : '0B',
        connectedClients: clientsMatch ? parseInt(clientsMatch[1], 10) : 0,
        dbSize
      }
    } catch {
      return {
        version: 'unknown',
        usedMemory: '0B',
        connectedClients: 0,
        dbSize: 0
      }
    }
  }

  private emitStatus(
    id: string,
    status: ConnectionStatus,
    state?: ConnectionState
  ): void {
    this.statusCallback(
      state || {
        id,
        status
      }
    )
  }
}
