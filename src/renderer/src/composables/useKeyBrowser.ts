import { computed, watch } from 'vue'
import { useKeysStore } from '@renderer/stores/keys.store'
import { useNotification } from './useNotification'

export function useKeyBrowser(connectionId: () => string) {
  const keysStore = useKeysStore()
  const { success, error } = useNotification()

  const keys = computed(() => keysStore.keys)
  const activeKey = computed(() => keysStore.activeKey)
  const activeKeyInfo = computed(() => keysStore.activeKeyInfo)
  const activeKeyValue = computed(() => keysStore.activeKeyValue)
  const loading = computed(() => keysStore.loading)
  const hasMore = computed(() => keysStore.hasMore)

  async function loadKeys(reset = false): Promise<void> {
    try {
      await keysStore.scanKeys(connectionId(), reset)
    } catch (e) {
      error('Failed to load keys', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function loadMore(): Promise<void> {
    try {
      await keysStore.loadMore(connectionId())
    } catch (e) {
      error('Failed to load more keys', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function selectKey(key: string): Promise<void> {
    try {
      await keysStore.selectKey(connectionId(), key)
    } catch (e) {
      error('Failed to load key', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function deleteKeys(keyNames: string[]): Promise<void> {
    try {
      await keysStore.deleteKeys(connectionId(), keyNames)
      success(`Deleted ${keyNames.length} key(s)`)
    } catch (e) {
      error('Failed to delete keys', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function renameKey(oldName: string, newName: string): Promise<void> {
    try {
      await keysStore.renameKey(connectionId(), oldName, newName)
      success('Key renamed')
    } catch (e) {
      error('Failed to rename key', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function setExpiry(key: string, ttl: number): Promise<void> {
    try {
      await keysStore.setExpiry(connectionId(), key, ttl)
      success('TTL updated')
    } catch (e) {
      error('Failed to set TTL', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function refreshKey(): Promise<void> {
    if (activeKey.value) {
      try {
        await keysStore.refreshKey(connectionId(), activeKey.value)
      } catch (e) {
        error('Failed to refresh key', e instanceof Error ? e.message : 'Unknown error')
      }
    }
  }

  // Reload keys when search pattern changes
  watch(
    () => keysStore.searchPattern,
    () => loadKeys(true),
    { debounce: 300 } as any
  )

  return {
    keys,
    activeKey,
    activeKeyInfo,
    activeKeyValue,
    loading,
    hasMore,
    loadKeys,
    loadMore,
    selectKey,
    deleteKeys,
    renameKey,
    setExpiry,
    refreshKey,
    searchPattern: computed({
      get: () => keysStore.searchPattern,
      set: (v: string) => keysStore.setSearchPattern(v)
    }),
    typeFilter: computed({
      get: () => keysStore.typeFilter,
      set: (v: string) => keysStore.setTypeFilter(v)
    }),
    viewMode: computed({
      get: () => keysStore.viewMode,
      set: (v: 'tree' | 'list') => keysStore.setViewMode(v)
    }),
    currentDb: computed(() => keysStore.currentDb)
  }
}
