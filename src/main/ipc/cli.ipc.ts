import { ipcMain } from 'electron'
import type { IpcServices } from './index'

export function registerCLIHandlers(services: IpcServices): void {
  const { connectionManager, cliService } = services

  ipcMain.handle('cli:execute', (_e, connId: string, command: string) => {
    const redis = connectionManager.getConnection(connId)
    if (!redis) throw new Error(`No active connection: ${connId}`)
    return cliService.execute(redis, command)
  })
}
