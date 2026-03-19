import { computed } from 'vue'
import { useConnectionStore } from '@renderer/stores/connection.store'
import { useNotification } from './useNotification'

export function useRedisConnection() {
  const connectionStore = useConnectionStore()
  const { success, error } = useNotification()

  const activeConnection = computed(() => {
    if (!connectionStore.activeConnectionId) return null
    return connectionStore.connections.find((c) => c.id === connectionStore.activeConnectionId)
  })

  const activeState = computed(() => {
    if (!connectionStore.activeConnectionId) return null
    return connectionStore.connectionStates.get(connectionStore.activeConnectionId)
  })

  const isConnected = computed(() => {
    return activeState.value?.status === 'connected'
  })

  async function connect(id: string): Promise<boolean> {
    try {
      await connectionStore.connect(id)
      success('Connected', `Connected to ${connectionStore.connections.find((c) => c.id === id)?.name}`)
      return true
    } catch (e) {
      error('Connection Failed', e instanceof Error ? e.message : 'Unknown error')
      return false
    }
  }

  async function disconnect(id: string): Promise<void> {
    try {
      await connectionStore.disconnect(id)
      success('Disconnected')
    } catch (e) {
      error('Disconnect Failed', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  return {
    activeConnection,
    activeState,
    isConnected,
    connect,
    disconnect,
    connections: computed(() => connectionStore.connections),
    connectionStates: computed(() => connectionStore.connectionStates)
  }
}
