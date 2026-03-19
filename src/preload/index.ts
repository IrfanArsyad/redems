import { contextBridge, ipcRenderer } from 'electron'
import type {
  IpcInvokeChannel,
  IpcInvokeArgs,
  IpcInvokeReturn,
  IpcEventChannel,
  IpcEventPayload
} from '@shared/types/ipc-channels'

const api = {
  invoke<C extends IpcInvokeChannel>(
    channel: C,
    ...args: IpcInvokeArgs<C>
  ): Promise<IpcInvokeReturn<C>> {
    return ipcRenderer.invoke(channel, ...args)
  },

  on<C extends IpcEventChannel>(
    channel: C,
    callback: (payload: IpcEventPayload<C>) => void
  ): () => void {
    const handler = (_event: Electron.IpcRendererEvent, payload: IpcEventPayload<C>): void => {
      callback(payload)
    }
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  },

  off<C extends IpcEventChannel>(channel: C): void {
    ipcRenderer.removeAllListeners(channel)
  }
}

export type ApiType = typeof api

contextBridge.exposeInMainWorld('api', api)
