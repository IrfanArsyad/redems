import { ipcMain } from 'electron'
import type { IpcServices } from './index'
import type { ConnectionConfig } from '@shared/types/connection.types'
import { logger } from '../utils/logger'

export function registerConnectionHandlers(services: IpcServices): void {
  const { connectionManager, connectionStorage } = services

  ipcMain.handle('connection:list', () => {
    return connectionStorage.getAll()
  })

  ipcMain.handle('connection:create', (_event, config: ConnectionConfig) => {
    connectionStorage.save(config)
    logger.info(`Connection created: ${config.name} (${config.id})`)
  })

  ipcMain.handle('connection:update', (_event, config: ConnectionConfig) => {
    connectionStorage.update(config)
    logger.info(`Connection updated: ${config.name} (${config.id})`)
  })

  ipcMain.handle('connection:delete', (_event, id: string) => {
    connectionStorage.delete(id)
    connectionManager.disconnect(id)
    logger.info(`Connection deleted: ${id}`)
  })

  ipcMain.handle('connection:connect', async (_event, id: string) => {
    const config = connectionStorage.getAll().find((c) => c.id === id)
    if (!config) throw new Error(`Connection not found: ${id}`)
    return connectionManager.connect(config)
  })

  ipcMain.handle('connection:disconnect', async (_event, id: string) => {
    await connectionManager.disconnect(id)
    logger.info(`Disconnected: ${id}`)
  })

  ipcMain.handle('connection:test', async (_event, config: ConnectionConfig) => {
    return connectionManager.testConnection(config)
  })
}
