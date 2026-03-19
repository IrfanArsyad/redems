import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RedisServerInfo, RedisClientInfo, RedisSlowLogEntry } from '@shared/types/redis.types'

export const useServerStore = defineStore('server', () => {
  // State
  const serverInfo = ref<RedisServerInfo | null>(null)
  const config = ref<Record<string, string>>({})
  const clients = ref<RedisClientInfo[]>([])
  const slowLog = ref<RedisSlowLogEntry[]>([])
  const loading = ref<boolean>(false)
  const autoRefreshInterval = ref<number>(0) // 0 = disabled
  const refreshTimer = ref<number | null>(null)

  // Actions
  async function fetchInfo(connId: string): Promise<void> {
    loading.value = true
    try {
      serverInfo.value = await window.api.invoke('server:info', connId)
    } catch (err) {
      console.error('Failed to fetch server info:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchConfig(connId: string, pattern?: string): Promise<void> {
    loading.value = true
    try {
      config.value = await window.api.invoke('server:config-get', connId, pattern ?? '*')
    } catch (err) {
      console.error('Failed to fetch config:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function setConfig(connId: string, key: string, value: string): Promise<void> {
    try {
      await window.api.invoke('server:config-set', connId, key, value)
      // Update local state
      config.value[key] = value
    } catch (err) {
      console.error('Failed to set config:', err)
      throw err
    }
  }

  async function fetchClients(connId: string): Promise<void> {
    loading.value = true
    try {
      clients.value = await window.api.invoke('server:clients', connId)
    } catch (err) {
      console.error('Failed to fetch clients:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function killClient(connId: string, addr: string): Promise<void> {
    try {
      await window.api.invoke('server:client-kill', connId, addr)
      // Remove from local state
      clients.value = clients.value.filter((c) => c.addr !== addr)
    } catch (err) {
      console.error('Failed to kill client:', err)
      throw err
    }
  }

  async function fetchSlowLog(connId: string, count?: number): Promise<void> {
    loading.value = true
    try {
      slowLog.value = await window.api.invoke('server:slowlog', connId, count)
    } catch (err) {
      console.error('Failed to fetch slow log:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function startAutoRefresh(connId: string, interval: number): void {
    stopAutoRefresh()
    if (interval <= 0) return

    autoRefreshInterval.value = interval

    const tick = async (): Promise<void> => {
      try {
        await fetchInfo(connId)
      } catch {
        // Silently handle auto-refresh errors
      }
    }

    refreshTimer.value = window.setInterval(tick, interval * 1000)
  }

  function stopAutoRefresh(): void {
    if (refreshTimer.value !== null) {
      window.clearInterval(refreshTimer.value)
      refreshTimer.value = null
    }
    autoRefreshInterval.value = 0
  }

  return {
    // State
    serverInfo,
    config,
    clients,
    slowLog,
    loading,
    autoRefreshInterval,
    refreshTimer,

    // Actions
    fetchInfo,
    fetchConfig,
    setConfig,
    fetchClients,
    killClient,
    fetchSlowLog,
    startAutoRefresh,
    stopAutoRefresh
  }
})
