import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  RedisStreamEntry,
  RedisStreamInfo,
  RedisConsumerGroup,
  RedisConsumer,
  RedisPendingEntry
} from '@shared/types/redis.types'
import { IPC } from '@shared/constants/channels'

export const useStreamStore = defineStore('stream', () => {
  // State
  const entries = ref<RedisStreamEntry[]>([])
  const streamInfo = ref<RedisStreamInfo | null>(null)
  const groups = ref<RedisConsumerGroup[]>([])
  const selectedGroup = ref<string | null>(null)
  const consumers = ref<RedisConsumer[]>([])
  const pendingEntries = ref<RedisPendingEntry[]>([])
  const loading = ref<boolean>(false)

  // Actions
  async function fetchEntries(
    connId: string,
    key: string,
    start: string = '-',
    end: string = '+',
    count: number = 100
  ): Promise<void> {
    loading.value = true
    try {
      entries.value = await window.api.invoke(IPC.STREAM_XRANGE, connId, key, start, end, count)
    } catch (err) {
      console.error('Failed to fetch stream entries:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchInfo(connId: string, key: string): Promise<void> {
    try {
      streamInfo.value = await window.api.invoke(IPC.STREAM_XINFO, connId, key)
    } catch (err) {
      console.error('Failed to fetch stream info:', err)
      throw err
    }
  }

  async function fetchGroups(connId: string, key: string): Promise<void> {
    try {
      groups.value = await window.api.invoke(IPC.STREAM_GROUPS, connId, key)
    } catch (err) {
      console.error('Failed to fetch consumer groups:', err)
      throw err
    }
  }

  async function fetchConsumers(connId: string, key: string, group: string): Promise<void> {
    try {
      consumers.value = await window.api.invoke(IPC.STREAM_CONSUMERS, connId, key, group)
    } catch (err) {
      console.error('Failed to fetch consumers:', err)
      throw err
    }
  }

  async function fetchPending(connId: string, key: string, group: string): Promise<void> {
    try {
      pendingEntries.value = await window.api.invoke(
        IPC.STREAM_PENDING,
        connId,
        key,
        group,
        '-',
        '+',
        100
      )
    } catch (err) {
      console.error('Failed to fetch pending entries:', err)
      throw err
    }
  }

  async function addEntry(
    connId: string,
    key: string,
    fields: Record<string, string>,
    id: string = '*'
  ): Promise<string> {
    loading.value = true
    try {
      return await window.api.invoke(IPC.STREAM_XADD, connId, key, id, fields)
    } catch (err) {
      console.error('Failed to add stream entry:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteEntries(connId: string, key: string, ids: string[]): Promise<number> {
    loading.value = true
    try {
      return await window.api.invoke(IPC.STREAM_XDEL, connId, key, ids)
    } catch (err) {
      console.error('Failed to delete stream entries:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createGroup(
    connId: string,
    key: string,
    name: string,
    id: string = '$'
  ): Promise<void> {
    try {
      await window.api.invoke(IPC.STREAM_GROUP_CREATE, connId, key, name, id)
      await fetchGroups(connId, key)
    } catch (err) {
      console.error('Failed to create consumer group:', err)
      throw err
    }
  }

  async function destroyGroup(connId: string, key: string, name: string): Promise<void> {
    try {
      await window.api.invoke(IPC.STREAM_GROUP_DESTROY, connId, key, name)
      groups.value = groups.value.filter((g) => g.name !== name)
      if (selectedGroup.value === name) {
        selectedGroup.value = null
        consumers.value = []
        pendingEntries.value = []
      }
    } catch (err) {
      console.error('Failed to destroy consumer group:', err)
      throw err
    }
  }

  async function ackEntries(
    connId: string,
    key: string,
    group: string,
    ids: string[]
  ): Promise<number> {
    try {
      const count = await window.api.invoke(IPC.STREAM_XACK, connId, key, group, ids)
      // Refresh pending entries after ack
      await fetchPending(connId, key, group)
      return count
    } catch (err) {
      console.error('Failed to acknowledge entries:', err)
      throw err
    }
  }

  function setSelectedGroup(group: string | null): void {
    selectedGroup.value = group
  }

  return {
    // State
    entries,
    streamInfo,
    groups,
    selectedGroup,
    consumers,
    pendingEntries,
    loading,

    // Actions
    fetchEntries,
    fetchInfo,
    fetchGroups,
    fetchConsumers,
    fetchPending,
    addEntry,
    deleteEntries,
    createGroup,
    destroyGroup,
    ackEntries,
    setSelectedGroup
  }
})
