import { ipcMain } from 'electron'
import Redis from 'ioredis'
import type { IpcServices } from './index'
import { RedisClusterService } from '../services/redis/RedisClusterService'

const clusterService = new RedisClusterService()

export function registerClusterHandlers(services: IpcServices): void {
  const { connectionManager } = services

  const getRedis = (connId: string) => {
    const redis = connectionManager.getConnection(connId)
    if (!redis) throw new Error(`No active connection: ${connId}`)
    return redis as Redis
  }

  ipcMain.handle('cluster:info', (_e, connId: string) => {
    return clusterService.getClusterInfo(getRedis(connId))
  })

  ipcMain.handle('cluster:nodes', (_e, connId: string) => {
    return clusterService.getNodes(getRedis(connId))
  })
}
