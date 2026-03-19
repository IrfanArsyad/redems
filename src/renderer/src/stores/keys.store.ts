import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSettingsStore } from './settings.store'
import type {
  RedisKeyInfo,
  RedisScanResult,
  RedisDataType
} from '@shared/types/redis.types'

export type ViewMode = 'tree' | 'list'

export const useKeysStore = defineStore('keys', () => {
  // State
  const keys = ref<RedisKeyInfo[]>([])
  const cursor = ref<string>('0')
  const hasMore = ref<boolean>(false)
  const selectedKeys = ref<Set<string>>(new Set())
  const activeKey = ref<string | null>(null)
  const activeKeyInfo = ref<RedisKeyInfo | null>(null)
  const activeKeyValue = ref<any>(null)
  const searchPattern = ref<string>('*')
  const typeFilter = ref<string>('')
  const viewMode = ref<ViewMode>('tree')
  const currentDb = ref<number>(0)
  const loading = ref<boolean>(false)
  const loadingValue = ref<boolean>(false)

  // Getters
  const keyCount = computed(() => keys.value.length)
  const selectedCount = computed(() => selectedKeys.value.size)
  const hasSelection = computed(() => selectedKeys.value.size > 0)

  const filteredKeys = computed(() => {
    if (!typeFilter.value) return keys.value
    return keys.value.filter((k) => k.type === typeFilter.value)
  })

  // Actions
  async function scanKeys(connId: string, reset: boolean = true): Promise<void> {
    const settingsStore = useSettingsStore()
    loading.value = true
    try {
      if (reset) {
        keys.value = []
        cursor.value = '0'
      }
      const result: RedisScanResult = await window.api.invoke(
        'keys:scan',
        connId,
        searchPattern.value,
        cursor.value,
        settingsStore.scanCount,
        typeFilter.value || undefined
      )
      if (reset) {
        keys.value = result.keys
      } else {
        // Deduplicate when appending
        const existingSet = new Set(keys.value.map((k) => k.key))
        const newKeys = result.keys.filter((k) => !existingSet.has(k.key))
        keys.value = [...keys.value, ...newKeys]
      }
      cursor.value = result.cursor
      hasMore.value = result.cursor !== '0'
    } catch (err) {
      console.error('Failed to scan keys:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadMore(connId: string): Promise<void> {
    if (!hasMore.value || loading.value) return
    await scanKeys(connId, false)
  }

  async function selectKey(connId: string, key: string): Promise<void> {
    activeKey.value = key
    loadingValue.value = true
    try {
      // Load key info
      const info = await window.api.invoke('keys:info', connId, key)
      activeKeyInfo.value = info

      // Load value based on type
      let value: any = null
      switch (info.type) {
        case 'string':
          value = await window.api.invoke('string:get', connId, key)
          break
        case 'hash':
          value = await window.api.invoke('hash:getall', connId, key)
          break
        case 'list': {
          const len = await window.api.invoke('list:llen', connId, key)
          activeKeyInfo.value = { ...info, length: len }
          value = await window.api.invoke('list:lrange', connId, key, 0, 49)
          break
        }
        case 'set': {
          const card = await window.api.invoke('set:scard', connId, key)
          activeKeyInfo.value = { ...info, length: card }
          const scanResult = await window.api.invoke('set:sscan', connId, key, '0', '*', 100)
          value = scanResult.members
          break
        }
        case 'zset': {
          const zcard = await window.api.invoke('zset:zcard', connId, key)
          activeKeyInfo.value = { ...info, length: zcard }
          value = await window.api.invoke('zset:zrange', connId, key, 0, 49, true)
          break
        }
        case 'stream': {
          const xlen = await window.api.invoke('stream:xlen', connId, key)
          activeKeyInfo.value = { ...info, length: xlen }
          value = await window.api.invoke('stream:xrange', connId, key, '-', '+', 50)
          break
        }
        default:
          value = null
      }
      activeKeyValue.value = value
    } catch (err) {
      console.error('Failed to load key value:', err)
      activeKeyInfo.value = null
      activeKeyValue.value = null
      throw err
    } finally {
      loadingValue.value = false
    }
  }

  async function deleteKeys(connId: string, keysToDelete: string[]): Promise<number> {
    try {
      const deleted = await window.api.invoke('keys:delete', connId, keysToDelete)
      // Remove from local state
      const deletedSet = new Set(keysToDelete)
      keys.value = keys.value.filter((k) => !deletedSet.has(k.key))
      selectedKeys.value.forEach((k) => {
        if (deletedSet.has(k)) selectedKeys.value.delete(k)
      })
      if (activeKey.value && deletedSet.has(activeKey.value)) {
        activeKey.value = null
        activeKeyInfo.value = null
        activeKeyValue.value = null
      }
      return deleted
    } catch (err) {
      console.error('Failed to delete keys:', err)
      throw err
    }
  }

  async function renameKey(connId: string, oldKey: string, newKey: string): Promise<void> {
    try {
      await window.api.invoke('keys:rename', connId, oldKey, newKey)
      // Update local state
      const idx = keys.value.findIndex((k) => k.key === oldKey)
      if (idx !== -1) {
        keys.value[idx] = { ...keys.value[idx], key: newKey }
      }
      if (activeKey.value === oldKey) {
        activeKey.value = newKey
        if (activeKeyInfo.value) {
          activeKeyInfo.value = { ...activeKeyInfo.value, key: newKey }
        }
      }
      if (selectedKeys.value.has(oldKey)) {
        selectedKeys.value.delete(oldKey)
        selectedKeys.value.add(newKey)
      }
    } catch (err) {
      console.error('Failed to rename key:', err)
      throw err
    }
  }

  async function setExpiry(connId: string, key: string, ttl: number): Promise<void> {
    try {
      if (ttl < 0) {
        await window.api.invoke('keys:persist', connId, key)
      } else {
        await window.api.invoke('keys:expire', connId, key, ttl)
      }
      // Update local state
      const idx = keys.value.findIndex((k) => k.key === key)
      if (idx !== -1) {
        keys.value[idx] = { ...keys.value[idx], ttl: ttl < 0 ? -1 : ttl }
      }
      if (activeKeyInfo.value && activeKeyInfo.value.key === key) {
        activeKeyInfo.value = { ...activeKeyInfo.value, ttl: ttl < 0 ? -1 : ttl }
      }
    } catch (err) {
      console.error('Failed to set expiry:', err)
      throw err
    }
  }

  async function createKey(
    connId: string,
    key: string,
    type: RedisDataType,
    value: unknown,
    ttl?: number
  ): Promise<void> {
    try {
      await window.api.invoke('keys:create', connId, key, type, value, ttl)
      // Rescan to pick up the new key
      await scanKeys(connId, true)
    } catch (err) {
      console.error('Failed to create key:', err)
      throw err
    }
  }

  async function refreshKey(connId: string, key: string): Promise<void> {
    await selectKey(connId, key)
  }

  async function selectDb(connId: string, db: number): Promise<void> {
    try {
      await window.api.invoke('server:select-db', connId, db)
      currentDb.value = db
      // Clear and rescan
      clearKeys()
      await scanKeys(connId, true)
    } catch (err) {
      console.error('Failed to select DB:', err)
      throw err
    }
  }

  function setSearchPattern(pattern: string): void {
    searchPattern.value = pattern || '*'
  }

  function setTypeFilter(type: string): void {
    typeFilter.value = type
  }

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode
  }

  function toggleKeySelection(key: string): void {
    if (selectedKeys.value.has(key)) {
      selectedKeys.value.delete(key)
    } else {
      selectedKeys.value.add(key)
    }
  }

  function selectAllKeys(): void {
    keys.value.forEach((k) => selectedKeys.value.add(k.key))
  }

  function clearSelection(): void {
    selectedKeys.value.clear()
  }

  function clearKeys(): void {
    keys.value = []
    cursor.value = '0'
    hasMore.value = false
    selectedKeys.value.clear()
    activeKey.value = null
    activeKeyInfo.value = null
    activeKeyValue.value = null
  }

  return {
    // State
    keys,
    cursor,
    hasMore,
    selectedKeys,
    activeKey,
    activeKeyInfo,
    activeKeyValue,
    searchPattern,
    typeFilter,
    viewMode,
    currentDb,
    loading,
    loadingValue,

    // Getters
    keyCount,
    selectedCount,
    hasSelection,
    filteredKeys,

    // Actions
    scanKeys,
    loadMore,
    selectKey,
    deleteKeys,
    renameKey,
    setExpiry,
    createKey,
    refreshKey,
    selectDb,
    setSearchPattern,
    setTypeFilter,
    setViewMode,
    toggleKeySelection,
    selectAllKeys,
    clearSelection,
    clearKeys
  }
})
