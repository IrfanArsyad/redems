import { ipcMain } from 'electron'
import Redis from 'ioredis'
import type { IpcServices } from './index'
import { RedisMonitorService } from '../services/redis/RedisMonitorService'
import { RedisMemoryService } from '../services/redis/RedisMemoryService'
import { getMainWindow } from '../window'

const monitorService = new RedisMonitorService()
const memoryService = new RedisMemoryService()

monitorService.setDataCallback((_connId, entry) => {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('monitor:data', entry)
  }
})

memoryService.setProgressCallback((scanned, total) => {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('memory:progress', { scanned, total })
  }
})

export function registerMonitorHandlers(services: IpcServices): void {
  const { connectionManager } = services

  const getRedis = (connId: string) => {
    const redis = connectionManager.getConnection(connId)
    if (!redis) throw new Error(`No active connection: ${connId}`)
    return redis as Redis
  }

  ipcMain.handle('monitor:start', (_e, connId: string) => {
    return monitorService.start(connId, getRedis(connId))
  })

  ipcMain.handle('monitor:stop', (_e, connId: string) => {
    monitorService.stop(connId)
  })

  ipcMain.handle(
    'memory:analyze',
    (_e, connId: string, pattern: string, sampleSize: number) => {
      return memoryService.analyze(getRedis(connId), pattern, sampleSize)
    }
  )
}
