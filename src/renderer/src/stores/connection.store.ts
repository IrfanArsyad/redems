import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConnectionConfig, ConnectionState, ConnectionGroup } from '@shared/types/connection.types'
import { IPC } from '@shared/constants/channels'

export const useConnectionStore = defineStore('connection', () => {
  // State
  const connections = ref<ConnectionConfig[]>([])
  const connectionStates = ref<Map<string, ConnectionState>>(new Map())
  const activeConnectionId = ref<string | null>(null)
  const groups = ref<ConnectionGroup[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Getters
  const activeConnection = computed<ConnectionConfig | undefined>(() => {
    if (!activeConnectionId.value) return undefined
    return connections.value.find((c) => c.id === activeConnectionId.value)
  })

  const activeConnectionState = computed<ConnectionState | undefined>(() => {
    if (!activeConnectionId.value) return undefined
    return connectionStates.value.get(activeConnectionId.value)
  })

  const connectedIds = computed<string[]>(() => {
    const ids: string[] = []
    connectionStates.value.forEach((state, id) => {
      if (state.status === 'connected') {
        ids.push(id)
      }
    })
    return ids
  })

  const sortedConnections = computed<ConnectionConfig[]>(() => {
    return [...connections.value].sort((a, b) => {
      // Sort by group first, then by name
      if (a.group && b.group && a.group !== b.group) {
        return a.group.localeCompare(b.group)
      }
      if (a.group && !b.group) return -1
      if (!a.group && b.group) return 1
      return a.name.localeCompare(b.name)
    })
  })

  // Actions
  async function loadConnections(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      connections.value = await window.api.invoke(IPC.CONNECTION_LIST)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load connections'
      console.error('Failed to load connections:', err)
    } finally {
      loading.value = false
    }
  }

  async function saveConnection(config: ConnectionConfig): Promise<void> {
    error.value = null
    try {
      const existing = connections.value.find((c) => c.id === config.id)
      if (existing) {
        await window.api.invoke(IPC.CONNECTION_UPDATE, config)
        const index = connections.value.findIndex((c) => c.id === config.id)
        if (index !== -1) {
          connections.value[index] = config
        }
      } else {
        await window.api.invoke(IPC.CONNECTION_CREATE, config)
        connections.value.push(config)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save connection'
      console.error('Failed to save connection:', err)
      throw err
    }
  }

  async function deleteConnection(id: string): Promise<void> {
    error.value = null
    try {
      await window.api.invoke(IPC.CONNECTION_DELETE, id)
      connections.value = connections.value.filter((c) => c.id !== id)
      connectionStates.value.delete(id)
      if (activeConnectionId.value === id) {
        activeConnectionId.value = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete connection'
      console.error('Failed to delete connection:', err)
      throw err
    }
  }

  async function connect(id: string): Promise<ConnectionState> {
    error.value = null
    // Set connecting state immediately
    connectionStates.value.set(id, {
      id,
      status: 'connecting'
    })
    try {
      const state = await window.api.invoke(IPC.CONNECTION_CONNECT, id)
      connectionStates.value.set(id, state)
      activeConnectionId.value = id
      return state
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
      connectionStates.value.set(id, {
        id,
        status: 'error',
        error: errorMessage
      })
      error.value = errorMessage
      console.error('Failed to connect:', err)
      throw err
    }
  }

  async function disconnect(id: string): Promise<void> {
    error.value = null
    try {
      await window.api.invoke(IPC.CONNECTION_DISCONNECT, id)
      connectionStates.value.set(id, {
        id,
        status: 'disconnected'
      })
      if (activeConnectionId.value === id) {
        activeConnectionId.value = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disconnect'
      console.error('Failed to disconnect:', err)
      throw err
    }
  }

  async function testConnection(
    config: ConnectionConfig
  ): Promise<{ success: boolean; message: string; latency?: number }> {
    error.value = null
    try {
      return await window.api.invoke(IPC.CONNECTION_TEST, config)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed'
      error.value = errorMessage
      return { success: false, message: errorMessage }
    }
  }

  function getConnectionState(id: string): ConnectionState | undefined {
    return connectionStates.value.get(id)
  }

  function isConnected(id: string): boolean {
    const state = connectionStates.value.get(id)
    return state?.status === 'connected'
  }

  function setActiveConnection(id: string | null): void {
    activeConnectionId.value = id
  }

  function addGroup(name: string): void {
    if (!groups.value.find((g) => g.name === name)) {
      groups.value.push({ name, expanded: true })
    }
  }

  function removeGroup(name: string): void {
    groups.value = groups.value.filter((g) => g.name !== name)
    // Remove group reference from connections
    connections.value.forEach((c) => {
      if (c.group === name) {
        c.group = ''
      }
    })
  }

  function toggleGroup(name: string): void {
    const group = groups.value.find((g) => g.name === name)
    if (group) {
      group.expanded = !group.expanded
    }
  }

  // Listen for connection status events from main process
  function initEventListeners(): () => void {
    const unsubscribe = window.api.on(IPC.CONNECTION_STATUS, (state: ConnectionState) => {
      connectionStates.value.set(state.id, state)
    })
    return unsubscribe
  }

  return {
    // State
    connections,
    connectionStates,
    activeConnectionId,
    groups,
    loading,
    error,

    // Getters
    activeConnection,
    activeConnectionState,
    connectedIds,
    sortedConnections,

    // Actions
    loadConnections,
    saveConnection,
    deleteConnection,
    connect,
    disconnect,
    testConnection,
    getConnectionState,
    isConnected,
    setActiveConnection,
    addGroup,
    removeGroup,
    toggleGroup,
    initEventListeners
  }
})
