import Store from 'electron-store'
import { safeStorage } from 'electron'
import type { ConnectionConfig } from '@shared/types/connection.types'
import { logger } from '@main/utils/logger'

interface StoredConnection extends Omit<ConnectionConfig, 'password' | 'ssh' | 'sentinel'> {
  password?: string
  _passwordEncrypted?: boolean
  ssh: ConnectionConfig['ssh'] & {
    _passwordEncrypted?: boolean
    _privateKeyEncrypted?: boolean
    _passphraseEncrypted?: boolean
  }
  sentinel: ConnectionConfig['sentinel'] & {
    _passwordEncrypted?: boolean
  }
}

interface StoreSchema {
  connections: StoredConnection[]
}

export class ConnectionStorage {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'connections',
      defaults: {
        connections: []
      }
    })
  }

  /**
   * Get all saved connections, with passwords decrypted.
   */
  getAll(): ConnectionConfig[] {
    const stored = this.store.get('connections', [])
    return stored.map((conn) => this.decryptSecrets(conn))
  }

  /**
   * Save a new connection config. Passwords are encrypted before storage.
   */
  save(config: ConnectionConfig): void {
    const connections = this.store.get('connections', [])
    const existing = connections.findIndex((c) => c.id === config.id)

    const encrypted = this.encryptSecrets(config)

    if (existing >= 0) {
      connections[existing] = encrypted
    } else {
      connections.push(encrypted)
    }

    this.store.set('connections', connections)
    logger.info(`Connection saved: ${config.id} (${config.name})`)
  }

  /**
   * Update an existing connection config.
   */
  update(config: ConnectionConfig): void {
    const connections = this.store.get('connections', [])
    const index = connections.findIndex((c) => c.id === config.id)

    if (index < 0) {
      throw new Error(`Connection not found: ${config.id}`)
    }

    connections[index] = this.encryptSecrets(config)
    this.store.set('connections', connections)
    logger.info(`Connection updated: ${config.id} (${config.name})`)
  }

  /**
   * Delete a connection by ID.
   */
  delete(id: string): void {
    const connections = this.store.get('connections', [])
    const filtered = connections.filter((c) => c.id !== id)

    if (filtered.length === connections.length) {
      throw new Error(`Connection not found: ${id}`)
    }

    this.store.set('connections', filtered)
    logger.info(`Connection deleted: ${id}`)
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private canUseSafeStorage(): boolean {
    try {
      return safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  }

  private encrypt(value: string | undefined): { value: string | undefined; encrypted: boolean } {
    if (!value) {
      return { value: undefined, encrypted: false }
    }

    if (!this.canUseSafeStorage()) {
      logger.warn('safeStorage not available - storing secret as plain text')
      return { value, encrypted: false }
    }

    try {
      const buffer = safeStorage.encryptString(value)
      return { value: buffer.toString('base64'), encrypted: true }
    } catch (err) {
      logger.warn('Failed to encrypt secret, storing as plain text:', err)
      return { value, encrypted: false }
    }
  }

  private decrypt(value: string | undefined, encrypted: boolean): string | undefined {
    if (!value) return undefined
    if (!encrypted) return value

    if (!this.canUseSafeStorage()) {
      logger.warn('safeStorage not available - cannot decrypt secret')
      return value
    }

    try {
      const buffer = Buffer.from(value, 'base64')
      return safeStorage.decryptString(buffer)
    } catch (err) {
      logger.warn('Failed to decrypt secret, returning raw value:', err)
      return value
    }
  }

  private encryptSecrets(config: ConnectionConfig): StoredConnection {
    const { value: password, encrypted: passwordEncrypted } = this.encrypt(config.password)

    const { value: sshPassword, encrypted: sshPasswordEncrypted } = this.encrypt(
      config.ssh.password
    )
    const { value: sshPrivateKey, encrypted: sshPrivateKeyEncrypted } = this.encrypt(
      config.ssh.privateKey
    )
    const { value: sshPassphrase, encrypted: sshPassphraseEncrypted } = this.encrypt(
      config.ssh.passphrase
    )

    const { value: sentinelPassword, encrypted: sentinelPasswordEncrypted } = this.encrypt(
      config.sentinel.password
    )

    return {
      ...config,
      password,
      _passwordEncrypted: passwordEncrypted,
      ssh: {
        ...config.ssh,
        password: sshPassword,
        privateKey: sshPrivateKey,
        passphrase: sshPassphrase,
        _passwordEncrypted: sshPasswordEncrypted,
        _privateKeyEncrypted: sshPrivateKeyEncrypted,
        _passphraseEncrypted: sshPassphraseEncrypted
      },
      sentinel: {
        ...config.sentinel,
        password: sentinelPassword,
        _passwordEncrypted: sentinelPasswordEncrypted
      }
    }
  }

  private decryptSecrets(stored: StoredConnection): ConnectionConfig {
    return {
      ...stored,
      password: this.decrypt(stored.password, stored._passwordEncrypted ?? false),
      ssh: {
        enabled: stored.ssh.enabled,
        host: stored.ssh.host,
        port: stored.ssh.port,
        username: stored.ssh.username,
        password: this.decrypt(stored.ssh.password, stored.ssh._passwordEncrypted ?? false),
        privateKey: this.decrypt(
          stored.ssh.privateKey,
          stored.ssh._privateKeyEncrypted ?? false
        ),
        passphrase: this.decrypt(
          stored.ssh.passphrase,
          stored.ssh._passphraseEncrypted ?? false
        )
      },
      sentinel: {
        masterName: stored.sentinel.masterName,
        sentinels: stored.sentinel.sentinels,
        password: this.decrypt(
          stored.sentinel.password,
          stored.sentinel._passwordEncrypted ?? false
        )
      }
    }
  }
}
