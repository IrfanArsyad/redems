export type ConnectionMode = 'standalone' | 'cluster' | 'sentinel'

export interface SSHConfig {
  enabled: boolean
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  passphrase?: string
}

export interface SSLConfig {
  enabled: boolean
  ca?: string
  cert?: string
  key?: string
  rejectUnauthorized: boolean
}

export interface SentinelConfig {
  masterName: string
  sentinels: Array<{ host: string; port: number }>
  password?: string
}

export interface ConnectionConfig {
  id: string
  name: string
  host: string
  port: number
  password?: string
  username?: string
  db: number
  mode: ConnectionMode
  group?: string
  ssh: SSHConfig
  ssl: SSLConfig
  sentinel: SentinelConfig
  readOnly: boolean
  connectTimeout: number
  commandTimeout: number
  color?: string
  createdAt: number
  updatedAt: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ConnectionState {
  id: string
  status: ConnectionStatus
  error?: string
  serverVersion?: string
  usedMemory?: string
  connectedClients?: number
  dbSize?: number
  latency?: number
}

export interface ConnectionGroup {
  name: string
  expanded: boolean
}

export function createDefaultConnection(id: string): ConnectionConfig {
  return {
    id,
    name: 'New Connection',
    host: '127.0.0.1',
    port: 6379,
    password: '',
    username: '',
    db: 0,
    mode: 'standalone',
    group: '',
    ssh: {
      enabled: false,
      host: '',
      port: 22,
      username: ''
    },
    ssl: {
      enabled: false,
      rejectUnauthorized: true
    },
    sentinel: {
      masterName: 'mymaster',
      sentinels: [{ host: '127.0.0.1', port: 26379 }]
    },
    readOnly: false,
    connectTimeout: 10000,
    commandTimeout: 5000,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}
