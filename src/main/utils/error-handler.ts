import { logger } from './logger'

export interface IpcErrorResponse {
  success: false
  error: string
  code?: string
}

export interface IpcSuccessResponse<T = unknown> {
  success: true
  data: T
}

export type IpcResponse<T = unknown> = IpcSuccessResponse<T> | IpcErrorResponse

/**
 * Wraps an async IPC handler function with error catching.
 * On success, returns the raw value from the handler.
 * On failure, logs the error and throws a cleaned-up error message
 * so that Electron's IPC invoke mechanism propagates it to the renderer.
 */
export async function handleIpcError<T>(
  channel: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (err: unknown) {
    const message = formatErrorMessage(err)
    const code = extractErrorCode(err)

    logger.error(`IPC error on [${channel}]: ${message}`, err)

    // Throw a clean error so ipcMain.handle rejects with a readable message
    const error = new Error(message)
    if (code) {
      ;(error as Error & { code?: string }).code = code
    }
    throw error
  }
}

/**
 * Extracts a human-readable message from an unknown error value.
 */
export function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message
  }
  if (typeof err === 'string') {
    return err
  }
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'An unknown error occurred'
}

/**
 * Extracts an error code from an error object when available.
 * Common with ioredis errors (ECONNREFUSED, NOAUTH, etc.)
 */
function extractErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code: unknown }).code)
  }
  return undefined
}
