import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createWindow, getMainWindow } from './window'
import { registerAllHandlers } from './ipc'
import { RedisConnectionManager } from './services/redis/RedisConnectionManager'
import { SSHTunnelService } from './services/ssh/SSHTunnelService'
import { ConnectionStorage } from './services/storage/ConnectionStorage'
import { RedisKeyService } from './services/redis/RedisKeyService'
import { RedisServerService } from './services/redis/RedisServerService'
import { RedisCLIService } from './services/redis/RedisCLIService'
import { logger } from './utils/logger'

// Singleton services
const connectionStorage = new ConnectionStorage()
const sshTunnelService = new SSHTunnelService()
const connectionManager = new RedisConnectionManager(sshTunnelService, (state) => {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('connection:status', state)
  }
})
const keyService = new RedisKeyService()
const serverService = new RedisServerService()
const cliService = new RedisCLIService()

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.redis-manager.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPC handlers
  registerAllHandlers({
    connectionManager,
    connectionStorage,
    sshTunnelService,
    keyService,
    serverService,
    cliService
  })

  // Window control handlers
  ipcMain.handle('window:minimize', () => {
    getMainWindow()?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    const win = getMainWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    getMainWindow()?.close()
  })

  ipcMain.handle('window:is-maximized', () => {
    return getMainWindow()?.isMaximized() ?? false
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  logger.info('Application started')
})

app.on('window-all-closed', async () => {
  logger.info('All windows closed, cleaning up...')
  await connectionManager.disconnectAll()
  sshTunnelService.closeAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason)
})
