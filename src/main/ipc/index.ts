import { RedisConnectionManager } from '../services/redis/RedisConnectionManager'
import { ConnectionStorage } from '../services/storage/ConnectionStorage'
import { SSHTunnelService } from '../services/ssh/SSHTunnelService'
import { RedisKeyService } from '../services/redis/RedisKeyService'
import { RedisServerService } from '../services/redis/RedisServerService'
import { RedisCLIService } from '../services/redis/RedisCLIService'
import { registerConnectionHandlers } from './connection.ipc'
import { registerKeysHandlers } from './keys.ipc'
import { registerServerHandlers } from './server.ipc'
import { registerCLIHandlers } from './cli.ipc'
import { registerPubSubHandlers } from './pubsub.ipc'
import { registerMonitorHandlers } from './monitor.ipc'
import { registerClusterHandlers } from './cluster.ipc'
import { registerExportHandlers } from './export.ipc'

export interface IpcServices {
  connectionManager: RedisConnectionManager
  connectionStorage: ConnectionStorage
  sshTunnelService: SSHTunnelService
  keyService: RedisKeyService
  serverService: RedisServerService
  cliService: RedisCLIService
}

export function registerAllHandlers(services: IpcServices): void {
  registerConnectionHandlers(services)
  registerKeysHandlers(services)
  registerServerHandlers(services)
  registerCLIHandlers(services)
  registerPubSubHandlers(services)
  registerMonitorHandlers(services)
  registerClusterHandlers(services)
  registerExportHandlers()
}
