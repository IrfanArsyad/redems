import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RedisClusterInfo, RedisClusterNode } from '@shared/types/redis.types'
import { IPC } from '@shared/constants/channels'

export const useClusterStore = defineStore('cluster', () => {
  // State
  const clusterInfo = ref<RedisClusterInfo | null>(null)
  const loading = ref<boolean>(false)

  // Actions
  async function fetchClusterInfo(connId: string): Promise<void> {
    loading.value = true
    try {
      clusterInfo.value = await window.api.invoke(IPC.CLUSTER_INFO, connId)
    } catch (err) {
      console.error('Failed to fetch cluster info:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchNodes(connId: string): Promise<RedisClusterNode[]> {
    loading.value = true
    try {
      const nodes = await window.api.invoke(IPC.CLUSTER_NODES, connId)
      if (clusterInfo.value) {
        clusterInfo.value.nodes = nodes
      }
      return nodes
    } catch (err) {
      console.error('Failed to fetch cluster nodes:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    clusterInfo,
    loading,

    // Actions
    fetchClusterInfo,
    fetchNodes
  }
})
