<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useServerStore } from '@renderer/stores/server.store'
import type { RedisClientInfo } from '@shared/types/redis.types'
import { Search, RefreshCw, ChevronUp, X, Users, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const serverStore = useServerStore()

const searchQuery = ref<string>('')
const sortColumn = ref<keyof RedisClientInfo>('id')
const sortDirection = ref<'asc' | 'desc'>('asc')
const autoRefreshEnabled = ref<boolean>(false)
const autoRefreshTimer = ref<number | null>(null)
const confirmKill = ref<string | null>(null)
const error = ref<string | null>(null)

type SortableColumn = {
  key: keyof RedisClientInfo
  label: string
  width?: string
}

const columns: SortableColumn[] = [
  { key: 'id', label: 'ID', width: 'w-16' },
  { key: 'addr', label: 'Address', width: 'w-40' },
  { key: 'name', label: 'Name', width: 'w-28' },
  { key: 'db', label: 'DB', width: 'w-12' },
  { key: 'cmd', label: 'Command', width: 'w-24' },
  { key: 'age', label: 'Age', width: 'w-20' },
  { key: 'idle', label: 'Idle', width: 'w-20' },
  { key: 'flags', label: 'Flags', width: 'w-16' }
]

const filteredClients = computed<RedisClientInfo[]>(() => {
  let result = [...serverStore.clients]

  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (c) =>
        c.id.toLowerCase().includes(query) ||
        c.addr.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.cmd.toLowerCase().includes(query) ||
        c.flags.toLowerCase().includes(query)
    )
  }

  // Sort
  result.sort((a, b) => {
    const aVal = a[sortColumn.value]
    const bVal = b[sortColumn.value]

    let comparison = 0
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else {
      comparison = String(aVal).localeCompare(String(bVal))
    }

    return sortDirection.value === 'asc' ? comparison : -comparison
  })

  return result
})

const clientCount = computed<number>(() => serverStore.clients.length)

function toggleSort(column: keyof RedisClientInfo): void {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

async function loadClients(): Promise<void> {
  error.value = null
  try {
    await serverStore.fetchClients(props.connectionId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch clients'
  }
}

function startKill(addr: string): void {
  confirmKill.value = addr
}

function cancelKill(): void {
  confirmKill.value = null
}

async function doKill(addr: string): Promise<void> {
  try {
    await serverStore.killClient(props.connectionId, addr)
    confirmKill.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to kill client'
  }
}

function toggleAutoRefresh(): void {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  if (autoRefreshEnabled.value) {
    autoRefreshTimer.value = window.setInterval(() => {
      loadClients()
    }, 5000)
  } else {
    if (autoRefreshTimer.value !== null) {
      window.clearInterval(autoRefreshTimer.value)
      autoRefreshTimer.value = null
    }
  }
}

onMounted(() => {
  loadClients()
})

onUnmounted(() => {
  if (autoRefreshTimer.value !== null) {
    window.clearInterval(autoRefreshTimer.value)
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <div class="flex items-center gap-2">
        <h2 class="text-md font-medium text-text">Connected Clients</h2>
        <span class="text-xs text-text-muted bg-overlay-0 px-1.5 py-0.5 rounded-full">
          {{ clientCount }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Search -->
        <div class="relative">
          <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" :stroke-width="2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search clients..."
            class="w-48 text-xs bg-input-bg text-text border border-border rounded pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted"
          />
        </div>

        <!-- Auto-refresh toggle -->
        <button
          @click="toggleAutoRefresh"
          class="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded border transition-colors"
          :class="
            autoRefreshEnabled
              ? 'bg-accent text-white border-accent'
              : 'bg-surface-0 text-text-muted border-border hover:text-text hover:border-border-accent'
          "
        >
          <RefreshCw class="w-3 h-3" :class="autoRefreshEnabled ? 'animate-spin' : ''" :stroke-width="2" />
          <span>Auto</span>
        </button>

        <!-- Refresh -->
        <button
          @click="loadClients"
          :disabled="serverStore.loading"
          class="flex items-center gap-1.5 text-xs text-text-muted hover:text-text px-2 py-1.5 rounded border border-border hover:border-border-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw class="w-3 h-3" :class="serverStore.loading ? 'animate-spin' : ''" :stroke-width="2" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Error display -->
    <div
      v-if="error"
      class="mx-4 mt-3 px-3 py-2 bg-danger/10 border border-danger/30 rounded text-danger text-xs"
    >
      {{ error }}
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-auto scrollbar-thin">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-surface-0 z-10">
          <tr class="border-b border-border">
            <th
              v-for="col in columns"
              :key="col.key"
              @click="toggleSort(col.key)"
              class="text-left text-text-muted font-medium px-4 py-2 cursor-pointer hover:text-text transition-colors select-none"
              :class="col.width"
            >
              <div class="flex items-center gap-1">
                {{ col.label }}
                <ChevronUp
                  v-if="sortColumn === col.key"
                  class="w-3 h-3 text-accent"
                  :class="sortDirection === 'desc' ? 'rotate-180' : ''"
                  :stroke-width="2"
                />
              </div>
            </th>
            <th class="text-right text-text-muted font-medium px-4 py-2 w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="client in filteredClients"
            :key="client.id + client.addr"
            class="border-b border-border/50 hover:bg-overlay-0/50 transition-colors"
          >
            <td class="px-4 py-2 font-mono text-text">{{ client.id }}</td>
            <td class="px-4 py-2 font-mono text-text-secondary">{{ client.addr }}</td>
            <td class="px-4 py-2 text-text">{{ client.name || '-' }}</td>
            <td class="px-4 py-2 text-accent font-mono">{{ client.db }}</td>
            <td class="px-4 py-2 font-mono text-text-secondary">{{ client.cmd }}</td>
            <td class="px-4 py-2 text-text">{{ formatDuration(client.age) }}</td>
            <td class="px-4 py-2 text-text">{{ formatDuration(client.idle) }}</td>
            <td class="px-4 py-2 font-mono text-text-muted">{{ client.flags }}</td>
            <td class="px-4 py-2 text-right">
              <!-- Kill confirmation -->
              <div v-if="confirmKill === client.addr" class="flex items-center justify-end gap-1">
                <span class="text-xs text-danger mr-1">Kill?</span>
                <button
                  @click="doKill(client.addr)"
                  class="text-xs text-danger hover:text-danger/80 px-1.5 py-0.5 rounded border border-danger/30 hover:bg-danger/10 transition-colors"
                >
                  Yes
                </button>
                <button
                  @click="cancelKill"
                  class="text-xs text-text-muted hover:text-text px-1.5 py-0.5 rounded border border-border hover:bg-overlay-0 transition-colors"
                >
                  No
                </button>
              </div>
              <!-- Kill button -->
              <button
                v-else
                @click="startKill(client.addr)"
                class="text-xs text-text-muted hover:text-danger transition-colors px-1.5 py-0.5 rounded hover:bg-danger/10"
                title="Kill client"
              >
                <X class="w-3.5 h-3.5" :stroke-width="2" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state -->
      <div
        v-if="filteredClients.length === 0 && !serverStore.loading"
        class="flex flex-col items-center justify-center py-12 text-text-muted"
      >
        <Users class="w-8 h-8 mb-2 opacity-50" :stroke-width="1.5" />
        <p class="text-xs">
          {{ searchQuery ? 'No clients match your search' : 'No connected clients found' }}
        </p>
      </div>

      <!-- Loading state -->
      <div v-if="serverStore.loading && serverStore.clients.length === 0" class="flex items-center justify-center py-12">
        <Loader2 class="w-6 h-6 text-accent animate-spin" :stroke-width="3" />
      </div>
    </div>
  </div>
</template>
