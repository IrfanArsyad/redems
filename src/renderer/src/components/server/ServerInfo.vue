<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useServerStore } from '@renderer/stores/server.store'
import { Server, MemoryStick, Users, Activity, Key, Save, RefreshCw, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const serverStore = useServerStore()
const autoRefreshEnabled = ref<boolean>(false)
const selectedInterval = ref<number>(5)
const error = ref<string | null>(null)

const intervalOptions = [
  { label: '1s', value: 1 },
  { label: '2s', value: 2 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 }
]

async function refresh(): Promise<void> {
  error.value = null
  try {
    await serverStore.fetchInfo(props.connectionId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch server info'
  }
}

function toggleAutoRefresh(): void {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  if (autoRefreshEnabled.value) {
    serverStore.startAutoRefresh(props.connectionId, selectedInterval.value)
  } else {
    serverStore.stopAutoRefresh()
  }
}

function onIntervalChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  selectedInterval.value = Number(target.value)
  if (autoRefreshEnabled.value) {
    serverStore.startAutoRefresh(props.connectionId, selectedInterval.value)
  }
}

const info = computed(() => serverStore.serverInfo)

const uptimeHuman = computed<string>(() => {
  if (!info.value) return '-'
  const seconds = info.value.uptimeInSeconds
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (parts.length === 0) parts.push(`${seconds}s`)
  return parts.join(' ')
})

const fragColor = computed<string>(() => {
  if (!info.value) return 'text-text'
  const ratio = info.value.memFragmentationRatio
  if (ratio < 1.5) return 'text-success'
  if (ratio < 2) return 'text-warning'
  return 'text-danger'
})

const hitRatioPercent = computed<number>(() => {
  if (!info.value) return 0
  return Math.round(info.value.hitRate * 10000) / 100
})

const rdbLastSaveAgo = computed<string>(() => {
  if (!info.value || info.value.rdbLastSaveTime === 0) return 'Never'
  const now = Math.floor(Date.now() / 1000)
  const diff = now - info.value.rdbLastSaveTime
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
})

const databases = computed(() => {
  if (!info.value) return []
  return Object.entries(info.value.databases).map(([name, data]) => ({
    name,
    keys: data.keys,
    expires: data.expires,
    avgTtl: data.avgTtl
  }))
})

onMounted(() => {
  refresh()
})

onUnmounted(() => {
  serverStore.stopAutoRefresh()
})
</script>

<template>
  <div class="h-full overflow-y-auto p-5 scrollbar-thin bg-base">
    <!-- Header controls -->
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-md font-semibold text-text">Server Information</h2>
      <div class="flex items-center gap-2">
        <button
          @click="toggleAutoRefresh"
          class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-200"
          :class="
            autoRefreshEnabled
              ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20'
              : 'btn-secondary !text-xs !px-3 !py-1.5'
          "
        >
          <RefreshCw
            class="w-3 h-3"
            :class="autoRefreshEnabled ? 'animate-spin' : ''"
          />
          <span>Auto</span>
        </button>
        <select
          :value="selectedInterval"
          @change="onIntervalChange"
          class="text-xs bg-input-bg text-text-secondary border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/20 cursor-pointer transition-all"
        >
          <option v-for="opt in intervalOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <button
          @click="refresh"
          :disabled="serverStore.loading"
          class="btn-secondary !text-xs !px-3 !py-1.5"
        >
          <RefreshCw
            class="w-3 h-3"
            :class="serverStore.loading ? 'animate-spin' : ''"
          />
          Refresh
        </button>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="mb-4 px-4 py-3 bg-danger-muted border border-danger/20 rounded-lg text-danger text-xs"
    >
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="serverStore.loading && !info" class="flex flex-col items-center justify-center py-20">
      <Loader2 class="w-8 h-8 text-accent animate-spin mb-3" />
      <span class="text-xs text-text-muted">Loading server information...</span>
    </div>

    <!-- Dashboard cards -->
    <div v-if="info" class="grid grid-cols-2 xl:grid-cols-3 gap-3">
      <!-- Server card -->
      <div class="card-hover p-4">
        <div class="flex items-center gap-2.5 mb-4">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-muted">
            <Server class="w-4 h-4 text-accent" />
          </div>
          <span class="text-xs font-semibold text-text">Server</span>
        </div>
        <div class="space-y-2.5">
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">Version</span>
            <span class="text-text font-semibold tabular-nums">{{ info.version }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">Mode</span>
            <span class="text-text font-medium capitalize">{{ info.mode }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">OS</span>
            <span class="text-text-secondary text-xs truncate ml-2 max-w-[140px]" :title="info.os">
              {{ info.os }}
            </span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">Uptime</span>
            <span class="text-text font-semibold tabular-nums">{{ uptimeHuman }}</span>
          </div>
        </div>
      </div>

      <!-- Memory card -->
      <div class="card-hover p-4">
        <div class="flex items-center gap-2.5 mb-4">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-info-muted">
            <MemoryStick class="w-4 h-4 text-info" />
          </div>
          <span class="text-xs font-semibold text-text">Memory</span>
        </div>
        <div class="space-y-2.5">
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">Used</span>
            <span class="text-text font-semibold">{{ info.usedMemory }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">Peak</span>
            <span class="text-text font-medium">{{ info.usedMemoryPeak }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">RSS</span>
            <span class="text-text font-medium">{{ info.usedMemoryRss }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">Fragmentation</span>
            <span class="font-semibold tabular-nums" :class="fragColor">
              {{ info.memFragmentationRatio.toFixed(2) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Clients card -->
      <div class="card-hover p-4">
        <div class="flex items-center gap-2.5 mb-4">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-success-muted">
            <Users class="w-4 h-4 text-success" />
          </div>
          <span class="text-xs font-semibold text-text">Clients</span>
        </div>
        <div class="space-y-2.5">
          <div class="flex justify-between items-end text-xs">
            <span class="text-text-muted">Connected</span>
            <span class="text-text font-bold text-lg leading-none tabular-nums">
              {{ info.connectedClients }}
            </span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">Blocked</span>
            <span class="text-text font-medium tabular-nums">{{ info.blockedClients }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">Total received</span>
            <span class="text-text font-medium tabular-nums">
              {{ info.totalConnectionsReceived.toLocaleString() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Stats card -->
      <div class="card-hover p-4">
        <div class="flex items-center gap-2.5 mb-4">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-warning-muted">
            <Activity class="w-4 h-4 text-warning" />
          </div>
          <span class="text-xs font-semibold text-text">Stats</span>
        </div>
        <div class="space-y-2.5">
          <div class="flex justify-between items-end text-xs">
            <span class="text-text-muted">Commands/sec</span>
            <span class="text-text font-bold text-lg leading-none tabular-nums">
              {{ info.instantaneousOpsPerSec.toLocaleString() }}
            </span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">Total commands</span>
            <span class="text-text font-medium tabular-nums">
              {{ info.totalCommandsProcessed.toLocaleString() }}
            </span>
          </div>
          <div class="flex flex-col gap-2 text-xs mt-1">
            <div class="flex justify-between">
              <span class="text-text-muted">Hit ratio</span>
              <span class="text-text font-semibold tabular-nums">{{ hitRatioPercent }}%</span>
            </div>
            <div class="w-full h-1.5 bg-overlay-0 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="hitRatioPercent >= 80 ? 'bg-success' : hitRatioPercent >= 50 ? 'bg-warning' : 'bg-danger'"
                :style="{ width: `${hitRatioPercent}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Keyspace card -->
      <div class="card-hover p-4">
        <div class="flex items-center gap-2.5 mb-4">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-muted">
            <Key class="w-4 h-4 text-accent" />
          </div>
          <span class="text-xs font-semibold text-text">Keyspace</span>
        </div>
        <div v-if="databases.length === 0" class="text-xs text-text-faint">
          No databases with keys
        </div>
        <div v-else class="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
          <div
            v-for="db in databases"
            :key="db.name"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-accent font-mono font-medium">{{ db.name }}</span>
            <div class="flex items-center gap-3">
              <span class="text-text font-semibold tabular-nums">{{ db.keys.toLocaleString() }} keys</span>
              <span class="text-text-faint text-xs tabular-nums">{{ db.expires }} exp</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Persistence card -->
      <div class="card-hover p-4">
        <div class="flex items-center gap-2.5 mb-4">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-overlay-0">
            <Save class="w-4 h-4 text-text-secondary" />
          </div>
          <span class="text-xs font-semibold text-text">Persistence</span>
        </div>
        <div class="space-y-2.5">
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">RDB last save</span>
            <span class="text-text font-medium">{{ rdbLastSaveAgo }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">AOF enabled</span>
            <span
              class="font-semibold"
              :class="info.aofEnabled ? 'text-success' : 'text-text-faint'"
            >
              {{ info.aofEnabled ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-muted">Role</span>
            <span class="text-text font-medium capitalize">{{ info.role }}</span>
          </div>
          <div v-if="info.connectedSlaves > 0" class="flex justify-between text-xs">
            <span class="text-text-muted">Slaves</span>
            <span class="text-text font-medium tabular-nums">{{ info.connectedSlaves }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
