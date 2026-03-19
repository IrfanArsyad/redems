import { ipcMain } from 'electron'
import type { IpcServices } from './index'

export function registerServerHandlers(services: IpcServices): void {
  const { connectionManager, serverService } = services

  const getRedis = (connId: string) => {
    const redis = connectionManager.getConnection(connId)
    if (!redis) throw new Error(`No active connection: ${connId}`)
    return redis
  }

  ipcMain.handle('server:info', (_e, connId: string) => {
    return serverService.getInfo(getRedis(connId))
  })

  ipcMain.handle('server:config-get', (_e, connId: string, pattern: string) => {
    return serverService.getConfig(getRedis(connId), pattern)
  })

  ipcMain.handle('server:config-set', (_e, connId: string, key: string, value: string) => {
    return serverService.setConfig(getRedis(connId), key, value)
  })

  ipcMain.handle('server:clients', (_e, connId: string) => {
    return serverService.getClients(getRedis(connId))
  })

  ipcMain.handle('server:client-kill', (_e, connId: string, addr: string) => {
    return serverService.killClient(getRedis(connId), addr)
  })

  ipcMain.handle('server:slowlog', (_e, connId: string, count?: number) => {
    return serverService.getSlowLog(getRedis(connId), count)
  })

  ipcMain.handle('server:dbsize', (_e, connId: string) => {
    return serverService.getDbSize(getRedis(connId))
  })

  ipcMain.handle('server:flushdb', (_e, connId: string, async?: boolean) => {
    return serverService.flushDb(getRedis(connId), async)
  })

  ipcMain.handle('server:select-db', (_e, connId: string, db: number) => {
    return serverService.selectDb(getRedis(connId), db)
  })
}
