export type RedisDataType = 'string' | 'hash' | 'list' | 'set' | 'zset' | 'stream' | 'json' | 'unknown'

export interface RedisKeyInfo {
  key: string
  type: RedisDataType
  ttl: number
  memoryUsage?: number
  encoding?: string
  length?: number
}

export interface RedisScanResult {
  cursor: string
  keys: RedisKeyInfo[]
}

export interface RedisHashField {
  field: string
  value: string
}

export interface RedisListItem {
  index: number
  value: string
}

export interface RedisSetMember {
  value: string
}

export interface RedisZSetMember {
  value: string
  score: number
}

export interface RedisStreamEntry {
  id: string
  fields: Record<string, string>
}

export interface RedisStreamInfo {
  length: number
  firstEntry?: RedisStreamEntry
  lastEntry?: RedisStreamEntry
  groups: number
  radixTreeKeys: number
  radixTreeNodes: number
  lastGeneratedId: string
}

export interface RedisConsumerGroup {
  name: string
  consumers: number
  pending: number
  lastDeliveredId: string
}

export interface RedisConsumer {
  name: string
  pending: number
  idle: number
}

export interface RedisPendingEntry {
  id: string
  consumer: string
  idleTime: number
  deliveryCount: number
}

export interface RedisServerInfo {
  version: string
  mode: string
  os: string
  uptimeInSeconds: number
  uptimeInDays: number
  connectedClients: number
  blockedClients: number
  usedMemory: string
  usedMemoryPeak: string
  usedMemoryRss: string
  totalSystemMemory: string
  memFragmentationRatio: number
  totalConnectionsReceived: number
  totalCommandsProcessed: number
  instantaneousOpsPerSec: number
  keyspaceHits: number
  keyspaceMisses: number
  hitRate: number
  role: string
  connectedSlaves: number
  rdbLastSaveTime: number
  aofEnabled: boolean
  databases: Record<string, { keys: number; expires: number; avgTtl: number }>
  raw: Record<string, Record<string, string>>
}

export interface RedisClientInfo {
  id: string
  addr: string
  fd: string
  name: string
  db: number
  cmd: string
  age: number
  idle: number
  flags: string
  sub: number
  psub: number
  multi: number
  qbuf: number
  qbufFree: number
  obl: number
  oll: number
  omem: number
  events: string
}

export interface RedisSlowLogEntry {
  id: number
  timestamp: number
  duration: number
  args: string[]
  clientAddr: string
  clientName: string
}

export interface RedisClusterNode {
  id: string
  address: string
  flags: string[]
  master: string | null
  pingSent: number
  pongRecv: number
  configEpoch: number
  linkState: string
  slots: string[]
  role: 'master' | 'slave'
}

export interface RedisClusterInfo {
  state: string
  slotsAssigned: number
  slotsOk: number
  slotsPfail: number
  slotsFail: number
  knownNodes: number
  size: number
  currentEpoch: number
  myEpoch: number
  nodes: RedisClusterNode[]
}

export interface PubSubMessage {
  channel: string
  message: string
  pattern?: string
  timestamp: number
}

export interface MonitorEntry {
  timestamp: number
  db: number
  client: string
  command: string
  args: string[]
  raw: string
}

export interface MemoryAnalysisResult {
  totalKeys: number
  totalMemory: number
  scannedKeys: number
  topKeys: Array<{ key: string; memory: number; type: RedisDataType }>
  byNamespace: Record<string, { count: number; memory: number }>
  byType: Record<string, { count: number; memory: number }>
}

export interface ImportExportOptions {
  format: 'json' | 'csv' | 'redis-commands'
  pattern?: string
  includeValues: boolean
  includeTtl: boolean
}
