import { Client } from 'ssh2'
import * as net from 'net'
import type { SSHConfig } from '@shared/types/connection.types'
import { logger } from '@main/utils/logger'

interface ActiveTunnel {
  sshClient: Client
  localServer: net.Server
  localPort: number
}

export class SSHTunnelService {
  private tunnels: Map<string, ActiveTunnel> = new Map()

  /**
   * Create an SSH tunnel that forwards a local port to the remote Redis host/port.
   *
   * Returns the local port to connect to and a close function to tear down the tunnel.
   */
  async createTunnel(
    connectionId: string,
    sshConfig: SSHConfig,
    targetHost: string,
    targetPort: number
  ): Promise<{ localPort: number; close: () => void }> {
    // Close any existing tunnel for this connection
    if (this.tunnels.has(connectionId)) {
      await this.closeTunnel(connectionId)
    }

    return new Promise((resolve, reject) => {
      const sshClient = new Client()

      const connectConfig: Record<string, unknown> = {
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.username,
        readyTimeout: 10000,
        keepaliveInterval: 30000
      }

      // Authentication: private key takes priority over password
      if (sshConfig.privateKey) {
        connectConfig.privateKey = sshConfig.privateKey
        if (sshConfig.passphrase) {
          connectConfig.passphrase = sshConfig.passphrase
        }
      } else if (sshConfig.password) {
        connectConfig.password = sshConfig.password
      }

      sshClient.on('ready', () => {
        logger.info(
          `SSH connection established for [${connectionId}] to ${sshConfig.host}:${sshConfig.port}`
        )

        // Create a local TCP server that forwards connections through the SSH tunnel
        const localServer = net.createServer((clientSocket) => {
          sshClient.forwardOut(
            '127.0.0.1',
            clientSocket.localPort ?? 0,
            targetHost,
            targetPort,
            (err, stream) => {
              if (err) {
                logger.error(`SSH forward error [${connectionId}]:`, err.message)
                clientSocket.destroy()
                return
              }

              // Pipe data between the local socket and the SSH stream
              clientSocket.pipe(stream).pipe(clientSocket)

              stream.on('error', () => clientSocket.destroy())
              clientSocket.on('error', () => stream.destroy())

              stream.on('close', () => clientSocket.destroy())
              clientSocket.on('close', () => stream.destroy())
            }
          )
        })

        // Listen on a random available port
        localServer.listen(0, '127.0.0.1', () => {
          const address = localServer.address()
          if (!address || typeof address === 'string') {
            reject(new Error('Failed to get local server address'))
            return
          }

          const localPort = address.port

          const tunnel: ActiveTunnel = {
            sshClient,
            localServer,
            localPort
          }
          this.tunnels.set(connectionId, tunnel)

          logger.info(
            `SSH tunnel created for [${connectionId}]: 127.0.0.1:${localPort} -> ${targetHost}:${targetPort}`
          )

          resolve({
            localPort,
            close: () => {
              this.closeTunnel(connectionId)
            }
          })
        })

        localServer.on('error', (err) => {
          logger.error(`SSH local server error [${connectionId}]:`, err.message)
          reject(err)
        })
      })

      sshClient.on('error', (err) => {
        logger.error(`SSH client error [${connectionId}]:`, err.message)
        reject(new Error(`SSH connection failed: ${err.message}`))
      })

      sshClient.on('close', () => {
        logger.info(`SSH connection closed [${connectionId}]`)
        // Clean up the tunnel entry if the SSH connection drops unexpectedly
        this.tunnels.delete(connectionId)
      })

      sshClient.connect(connectConfig as Parameters<Client['connect']>[0])
    })
  }

  /**
   * Close a specific SSH tunnel by connection ID.
   */
  async closeTunnel(connectionId: string): Promise<void> {
    const tunnel = this.tunnels.get(connectionId)
    if (!tunnel) return

    try {
      tunnel.localServer.close()
    } catch {
      // Ignore server close errors
    }

    try {
      tunnel.sshClient.end()
    } catch {
      // Ignore client close errors
    }

    this.tunnels.delete(connectionId)
    logger.info(`SSH tunnel closed for [${connectionId}]`)
  }

  /**
   * Close all active SSH tunnels.
   */
  async closeAll(): Promise<void> {
    const ids = Array.from(this.tunnels.keys())
    for (const id of ids) {
      await this.closeTunnel(id)
    }
    logger.info('All SSH tunnels closed')
  }

  /**
   * Check if a tunnel exists for a given connection ID.
   */
  hasTunnel(connectionId: string): boolean {
    return this.tunnels.has(connectionId)
  }

  /**
   * Get the local port for an existing tunnel.
   */
  getLocalPort(connectionId: string): number | null {
    const tunnel = this.tunnels.get(connectionId)
    return tunnel ? tunnel.localPort : null
  }
}
