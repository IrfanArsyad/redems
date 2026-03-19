import { ipcMain } from 'electron'
import Redis from 'ioredis'
import type { IpcServices } from './index'
import { RedisPubSubService } from '../services/redis/RedisPubSubService'
import { getMainWindow } from '../window'

const pubsubService = new RedisPubSubService()

pubsubService.setMessageCallback((_connId, message) => {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('pubsub:message', message)
  }
})

export function registerPubSubHandlers(services: IpcServices): void {
  const { connectionManager } = services

  const getRedis = (connId: string) => {
    const redis = connectionManager.getConnection(connId)
    if (!redis) throw new Error(`No active connection: ${connId}`)
    return redis as Redis
  }

  ipcMain.handle('pubsub:subscribe', (_e, connId: string, channels: string[]) => {
    return pubsubService.subscribe(connId, getRedis(connId), channels)
  })

  ipcMain.handle('pubsub:psubscribe', (_e, connId: string, patterns: string[]) => {
    return pubsubService.psubscribe(connId, getRedis(connId), patterns)
  })

  ipcMain.handle('pubsub:unsubscribe', (_e, connId: string, channels: string[]) => {
    return pubsubService.unsubscribe(connId, channels)
  })

  ipcMain.handle('pubsub:punsubscribe', (_e, connId: string, patterns: string[]) => {
    return pubsubService.punsubscribe(connId, patterns)
  })

  ipcMain.handle('pubsub:publish', (_e, connId: string, channel: string, message: string) => {
    return pubsubService.publish(getRedis(connId), channel, message)
  })
}
