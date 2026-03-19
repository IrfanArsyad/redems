<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useKeysStore } from '@renderer/stores/keys.store'
import { useServerStore } from '@renderer/stores/server.store'
import { useConnectionStore } from '@renderer/stores/connection.store'
import StringEditor from './editors/StringEditor.vue'
import HashEditor from './editors/HashEditor.vue'
import ListEditor from './editors/ListEditor.vue'
import SetEditor from './editors/SetEditor.vue'
import ZSetEditor from './editors/ZSetEditor.vue'
import StreamEditor from './editors/StreamEditor.vue'
import RenameKeyDialog from './dialogs/RenameKeyDialog.vue'
import TTLDialog from './dialogs/TTLDialog.vue'
import {
  Key, Loader2, RefreshCw, Copy, Pencil, Clock, Trash2, Database, HardDrive, Hash,
  Server, MemoryStick, Users, Activity, Gauge, Zap
} from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const keysStore = useKeysStore()
const serverStore = useServerStore()
const connectionStore = useConnectionStore()

// Server overview (shown when no key selected)
const serverInfo = computed(() => serverStore.serverInfo)
const connectionName = computed(() => {
  const conn = connectionStore.activeConnection
  return conn?.name ?? 'Redis Server'
})

const uptimeHuman = computed(() => {
  if (!serverInfo.value) return '-'
  const s = serverInfo.value.uptimeInSeconds
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  return parts.length > 0 ? parts.join(' ') : `${s}s`
})

const hitRatioPercent = computed(() => {
  if (!serverInfo.value) return 0
  return Math.round(serverInfo.value.hitRate * 10000) / 100
})

const fragColor = computed(() => {
  if (!serverInfo.value) return 'text-text'
  const ratio = serverInfo.value.memFragmentationRatio
  if (ratio < 1.5) return 'text-success'
  if (ratio < 2) return 'text-warning'
  return 'text-danger'
})

const totalKeys = computed(() => {
  if (!serverInfo.value) return 0
  return Object.values(serverInfo.value.databases).reduce((sum, db) => sum + db.keys, 0)
})

const cpuUsage = computed(() => {
  if (!serverInfo.value?.raw?.cpu) return null
  const sys = parseFloat(serverInfo.value.raw.cpu.used_cpu_sys || '0')
  const user = parseFloat(serverInfo.value.raw.cpu.used_cpu_user || '0')
  return { sys: sys.toFixed(2), user: user.toFixed(2), total: (sys + user).toFixed(2) }
})

let serverRefreshTimer: ReturnType<typeof setInterval> | null = null

function startServerRefresh(): void {
  stopServerRefresh()
  serverStore.fetchInfo(props.connectionId).catch(() => {})
  serverRefreshTimer = setInterval(() => {
    if (!keysStore.activeKey) {
      serverStore.fetchInfo(props.connectionId).catch(() => {})
    }
  }, 5000)
}

function stopServerRefresh(): void {
  if (serverRefreshTimer) {
    clearInterval(serverRefreshTimer)
    serverRefreshTimer = null
  }
}

// Start server info polling when no key is selected
watch(() => keysStore.activeKey, (newKey) => {
  if (!newKey) {
    startServerRefresh()
  } else {
    stopServerRefresh()
  }
}, { immediate: true })

onMounted(() => {
  if (!keysStore.activeKey) {
    startServerRefresh()
  }
})

onUnmounted(() => {
  stopServerRefresh()
})

const showRenameDialog = ref(false)
const showTTLDialog = ref(false)

// Auto-refresh
const autoRefreshEnabled = ref(false)
const autoRefreshInterval = ref(5)
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null

const intervalOptions = [
  { label: '1s', value: 1 },
  { label: '2s', value: 2 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 }
]

function startAutoRefresh(): void {
  stopAutoRefresh()
  if (keysStore.activeKey) {
    autoRefreshTimer = setInterval(() => {
      if (keysStore.activeKey) {
        keysStore.refreshKey(props.connectionId, keysStore.activeKey)
      }
    }, autoRefreshInterval.value * 1000)
  }
}

function stopAutoRefresh(): void {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

function toggleAutoRefresh(): void {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  if (autoRefreshEnabled.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

function onAutoRefreshIntervalChange(event: Event): void {
  autoRefreshInterval.value = Number((event.target as HTMLSelectElement).value)
  if (autoRefreshEnabled.value) {
    startAutoRefresh()
  }
}

// Stop auto-refresh when key changes or component unmounts
watch(() => keysStore.activeKey, () => {
  if (autoRefreshEnabled.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})

const typeBadgeColors: Record<string, string> = {
  string: 'bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/20',
  hash: 'bg-sky-500/12 text-sky-400 ring-1 ring-sky-500/20',
  list: 'bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/20',
  set: 'bg-violet-500/12 text-violet-400 ring-1 ring-violet-500/20',
  zset: 'bg-rose-500/12 text-rose-400 ring-1 ring-rose-500/20',
  stream: 'bg-cyan-500/12 text-cyan-400 ring-1 ring-cyan-500/20',
  unknown: 'bg-gray-500/12 text-gray-400 ring-1 ring-gray-500/20'
}

const ttlDisplay = computed(() => {
  if (!keysStore.activeKeyInfo) return ''
  const ttl = keysStore.activeKeyInfo.ttl
  if (ttl === -1) return 'Persistent'
  if (ttl === -2) return 'Expired'
  if (ttl < 60) return `${ttl}s`
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m ${ttl % 60}s`
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h ${Math.floor((ttl % 3600) / 60)}m`
  return `${Math.floor(ttl / 86400)}d ${Math.floor((ttl % 86400) / 3600)}h`
})

const memoryDisplay = computed(() => {
  const mem = keysStore.activeKeyInfo?.memoryUsage
  if (!mem) return '-'
  if (mem < 1024) return `${mem} B`
  if (mem < 1024 * 1024) return `${(mem / 1024).toFixed(1)} KB`
  return `${(mem / (1024 * 1024)).toFixed(1)} MB`
})

function onRefresh(): void {
  if (keysStore.activeKey) {
    keysStore.refreshKey(props.connectionId, keysStore.activeKey)
  }
}

function onCopyKeyName(): void {
  if (keysStore.activeKey) {
    navigator.clipboard.writeText(keysStore.activeKey)
  }
}

async function onDelete(): Promise<void> {
  if (!keysStore.activeKey) return
  if (confirm(`Delete key "${keysStore.activeKey}"?`)) {
    await keysStore.deleteKeys(props.connectionId, [keysStore.activeKey])
  }
}

async function onRename(newName: string): Promise<void> {
  if (!keysStore.activeKey) return
  await keysStore.renameKey(props.connectionId, keysStore.activeKey, newName)
  showRenameDialog.value = false
}

async function onSaveTTL(ttl: number): Promise<void> {
  if (!keysStore.activeKey) return
  await keysStore.setExpiry(props.connectionId, keysStore.activeKey, ttl)
  showTTLDialog.value = false
}

async function onPersist(): Promise<void> {
  if (!keysStore.activeKey) return
  await keysStore.setExpiry(props.connectionId, keysStore.activeKey, -1)
  showTTLDialog.value = false
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Server overview when no key selected -->
    <div
      v-if="!keysStore.activeKey"
      class="flex flex-col h-full overflow-auto"
    >
      <!-- Header -->
      <div class="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface-0 flex-shrink-0">
        <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-muted">
          <Server class="w-4.5 h-4.5 text-accent" :stroke-width="1.75" />
        </div>
        <div>
          <h2 class="text-md font-semibold text-text">{{ connectionName }}</h2>
          <p class="text-xs text-text-muted">
            <template v-if="serverInfo">
              Redis {{ serverInfo.version }} &middot; {{ serverInfo.mode }} &middot; Uptime {{ uptimeHuman }}
            </template>
            <template v-else>Loading server info...</template>
          </p>
        </div>
        <div class="ml-auto text-xs text-text-faint select-none">Select a key to inspect</div>
      </div>

      <!-- Dashboard -->
      <div v-if="serverInfo" class="flex-1 p-5 space-y-4">
        <!-- Stat cards row -->
        <div class="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <!-- Memory -->
          <div class="card p-4">
            <div class="flex items-center gap-2 mb-3">
              <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-info-muted">
                <MemoryStick class="w-3.5 h-3.5 text-info" :stroke-width="2" />
              </div>
              <span class="text-xs font-medium text-text-muted">Memory</span>
            </div>
            <div class="text-xl font-bold text-text tabular-nums">{{ serverInfo.usedMemory }}</div>
            <div class="flex items-center justify-between mt-2 text-xs text-text-muted">
              <span>Peak: {{ serverInfo.usedMemoryPeak }}</span>
              <span :class="fragColor" class="font-semibold tabular-nums">
                Frag {{ serverInfo.memFragmentationRatio.toFixed(2) }}
              </span>
            </div>
          </div>

          <!-- Commands/sec -->
          <div class="card p-4">
            <div class="flex items-center gap-2 mb-3">
              <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-warning-muted">
                <Zap class="w-3.5 h-3.5 text-warning" :stroke-width="2" />
              </div>
              <span class="text-xs font-medium text-text-muted">Throughput</span>
            </div>
            <div class="text-xl font-bold text-text tabular-nums">
              {{ serverInfo.instantaneousOpsPerSec.toLocaleString() }}
              <span class="text-xs font-normal text-text-muted">ops/s</span>
            </div>
            <div class="mt-2 text-xs text-text-muted">
              Total: {{ serverInfo.totalCommandsProcessed.toLocaleString() }} commands
            </div>
          </div>

          <!-- Clients -->
          <div class="card p-4">
            <div class="flex items-center gap-2 mb-3">
              <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-success-muted">
                <Users class="w-3.5 h-3.5 text-success" :stroke-width="2" />
              </div>
              <span class="text-xs font-medium text-text-muted">Clients</span>
            </div>
            <div class="text-xl font-bold text-text tabular-nums">{{ serverInfo.connectedClients }}</div>
            <div class="flex items-center justify-between mt-2 text-xs text-text-muted">
              <span>Blocked: {{ serverInfo.blockedClients }}</span>
              <span class="tabular-nums">{{ serverInfo.totalConnectionsReceived.toLocaleString() }} total</span>
            </div>
          </div>

          <!-- Keys -->
          <div class="card p-4">
            <div class="flex items-center gap-2 mb-3">
              <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-muted">
                <Key class="w-3.5 h-3.5 text-accent" :stroke-width="2" />
              </div>
              <span class="text-xs font-medium text-text-muted">Keyspace</span>
            </div>
            <div class="text-xl font-bold text-text tabular-nums">{{ totalKeys.toLocaleString() }}</div>
            <div class="mt-2 text-xs text-text-muted">
              Across {{ Object.keys(serverInfo.databases).length }} database{{ Object.keys(serverInfo.databases).length !== 1 ? 's' : '' }}
            </div>
          </div>
        </div>

        <!-- Second row -->
        <div class="grid grid-cols-2 xl:grid-cols-3 gap-3">
          <!-- Hit Rate -->
          <div class="card p-4">
            <div class="flex items-center gap-2 mb-3">
              <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-muted">
                <Gauge class="w-3.5 h-3.5 text-accent" :stroke-width="2" />
              </div>
              <span class="text-xs font-medium text-text-muted">Hit Rate</span>
              <span class="ml-auto text-md font-bold tabular-nums" :class="hitRatioPercent >= 80 ? 'text-success' : hitRatioPercent >= 50 ? 'text-warning' : 'text-danger'">
                {{ hitRatioPercent }}%
              </span>
            </div>
            <div class="w-full h-2 bg-overlay-0 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="hitRatioPercent >= 80 ? 'bg-success' : hitRatioPercent >= 50 ? 'bg-warning' : 'bg-danger'"
                :style="{ width: `${hitRatioPercent}%` }"
              />
            </div>
            <div class="flex justify-between mt-2 text-xs text-text-muted tabular-nums">
              <span>Hits: {{ serverInfo.keyspaceHits.toLocaleString() }}</span>
              <span>Misses: {{ serverInfo.keyspaceMisses.toLocaleString() }}</span>
            </div>
          </div>

          <!-- CPU (if available) -->
          <div v-if="cpuUsage" class="card p-4">
            <div class="flex items-center gap-2 mb-3">
              <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-danger-muted">
                <Activity class="w-3.5 h-3.5 text-danger" :stroke-width="2" />
              </div>
              <span class="text-xs font-medium text-text-muted">CPU Time</span>
            </div>
            <div class="text-xl font-bold text-text tabular-nums">{{ cpuUsage.total }}s</div>
            <div class="flex items-center justify-between mt-2 text-xs text-text-muted tabular-nums">
              <span>System: {{ cpuUsage.sys }}s</span>
              <span>User: {{ cpuUsage.user }}s</span>
            </div>
          </div>

          <!-- Persistence -->
          <div class="card p-4">
            <div class="flex items-center gap-2 mb-3">
              <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-overlay-0">
                <Database class="w-3.5 h-3.5 text-text-secondary" :stroke-width="2" />
              </div>
              <span class="text-xs font-medium text-text-muted">Persistence</span>
            </div>
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-text-muted">Role</span>
                <span class="text-text font-medium capitalize">{{ serverInfo.role }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-text-muted">AOF</span>
                <span class="font-medium" :class="serverInfo.aofEnabled ? 'text-success' : 'text-text-faint'">
                  {{ serverInfo.aofEnabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
              <div v-if="serverInfo.connectedSlaves > 0" class="flex justify-between text-xs">
                <span class="text-text-muted">Replicas</span>
                <span class="text-text font-medium tabular-nums">{{ serverInfo.connectedSlaves }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Database breakdown -->
        <div v-if="Object.keys(serverInfo.databases).length > 0" class="card overflow-hidden">
          <div class="px-4 py-2.5 border-b border-border bg-surface-0/50">
            <span class="text-xs font-semibold text-text">Databases</span>
          </div>
          <div class="divide-y divide-border-subtle">
            <div
              v-for="(data, dbName) in serverInfo.databases"
              :key="dbName"
              class="flex items-center justify-between px-4 py-2 hover:bg-overlay-0/20 transition-colors"
            >
              <span class="text-xs font-mono font-medium text-accent">{{ dbName }}</span>
              <div class="flex items-center gap-4 text-xs tabular-nums">
                <span class="text-text font-semibold">{{ data.keys.toLocaleString() }} keys</span>
                <span class="text-text-muted">{{ data.expires }} expires</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-else class="flex-1 flex items-center justify-center">
        <Loader2 class="w-6 h-6 animate-spin text-accent" :stroke-width="2" />
      </div>
    </div>

    <!-- Loading value -->
    <div
      v-else-if="keysStore.loadingValue"
      class="flex items-center justify-center h-full"
    >
      <Loader2 class="w-6 h-6 animate-spin text-accent" :stroke-width="2" />
    </div>

    <!-- Key detail -->
    <template v-else-if="keysStore.activeKeyInfo">
      <!-- Key header -->
      <div class="flex items-center gap-3 px-4 py-3 bg-surface-0 border-b border-border flex-shrink-0">
        <div class="flex-1 min-w-0">
          <!-- Key name and type badge -->
          <div class="flex items-center gap-2.5 mb-1.5">
            <h3 class="text-md font-semibold text-text truncate font-mono" :title="keysStore.activeKey ?? ''">
              {{ keysStore.activeKey }}
            </h3>
            <span
              class="flex-shrink-0 badge"
              :class="typeBadgeColors[keysStore.activeKeyInfo.type] || typeBadgeColors.unknown"
            >
              {{ keysStore.activeKeyInfo.type }}
            </span>
          </div>

          <!-- Key metadata row -->
          <div class="flex items-center gap-4 text-xs text-text-faint">
            <span class="flex items-center gap-1">
              <Clock class="w-3 h-3" :stroke-width="2" />
              {{ ttlDisplay }}
            </span>
            <span v-if="keysStore.activeKeyInfo.encoding" class="flex items-center gap-1">
              <Database class="w-3 h-3" :stroke-width="2" />
              {{ keysStore.activeKeyInfo.encoding }}
            </span>
            <span class="flex items-center gap-1">
              <HardDrive class="w-3 h-3" :stroke-width="2" />
              {{ memoryDisplay }}
            </span>
            <span v-if="keysStore.activeKeyInfo.length !== undefined" class="flex items-center gap-1">
              <Hash class="w-3 h-3" :stroke-width="2" />
              {{ keysStore.activeKeyInfo.length }} items
            </span>
          </div>
        </div>

        <!-- Auto-refresh + Action buttons -->
        <div class="flex items-center gap-0.5 flex-shrink-0">
          <!-- Auto-refresh controls -->
          <button
            class="flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border transition-all duration-200"
            :class="autoRefreshEnabled
              ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20'
              : 'border-border text-text-muted hover:text-text hover:border-border-accent'"
            title="Toggle auto-refresh"
            @click="toggleAutoRefresh"
          >
            <RefreshCw
              class="w-3 h-3"
              :class="{ 'animate-spin': autoRefreshEnabled }"
              :stroke-width="2"
            />
            Auto
          </button>
          <select
            :value="autoRefreshInterval"
            class="h-7 text-xs bg-input-bg text-text-secondary border border-border rounded-md px-1.5 focus:outline-none focus:ring-1 focus:ring-accent/20 cursor-pointer"
            @change="onAutoRefreshIntervalChange"
          >
            <option v-for="opt in intervalOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>

          <span class="divider-v" />

          <button class="btn-icon-sm" title="Refresh" @click="onRefresh">
            <RefreshCw class="w-3.5 h-3.5" :stroke-width="2" />
          </button>

          <button class="btn-icon-sm" title="Copy Key Name" @click="onCopyKeyName">
            <Copy class="w-3.5 h-3.5" :stroke-width="2" />
          </button>

          <button class="btn-icon-sm" title="Rename" @click="showRenameDialog = true">
            <Pencil class="w-3.5 h-3.5" :stroke-width="2" />
          </button>

          <button class="btn-icon-sm" title="Set TTL" @click="showTTLDialog = true">
            <Clock class="w-3.5 h-3.5" :stroke-width="2" />
          </button>

          <span class="divider-v" />

          <button
            class="btn-icon-sm hover:!bg-danger-muted hover:!text-danger"
            title="Delete Key"
            @click="onDelete"
          >
            <Trash2 class="w-3.5 h-3.5" :stroke-width="2" />
          </button>
        </div>
      </div>

      <!-- Value editor based on type -->
      <div class="flex-1 min-h-0 overflow-auto">
        <StringEditor
          v-if="keysStore.activeKeyInfo.type === 'string'"
          :connection-id="connectionId"
          :key-name="keysStore.activeKey!"
          :value="keysStore.activeKeyValue ?? ''"
        />

        <HashEditor
          v-else-if="keysStore.activeKeyInfo.type === 'hash'"
          :connection-id="connectionId"
          :key-name="keysStore.activeKey!"
        />

        <ListEditor
          v-else-if="keysStore.activeKeyInfo.type === 'list'"
          :connection-id="connectionId"
          :key-name="keysStore.activeKey!"
        />

        <SetEditor
          v-else-if="keysStore.activeKeyInfo.type === 'set'"
          :connection-id="connectionId"
          :key-name="keysStore.activeKey!"
        />

        <ZSetEditor
          v-else-if="keysStore.activeKeyInfo.type === 'zset'"
          :connection-id="connectionId"
          :key-name="keysStore.activeKey!"
        />

        <StreamEditor
          v-else-if="keysStore.activeKeyInfo.type === 'stream'"
          :connection-id="connectionId"
          :key-name="keysStore.activeKey!"
        />

        <div
          v-else
          class="flex items-center justify-center h-full text-text-muted text-md"
        >
          Unsupported key type: {{ keysStore.activeKeyInfo.type }}
        </div>
      </div>
    </template>

    <!-- Dialogs -->
    <RenameKeyDialog
      v-if="showRenameDialog"
      :visible="showRenameDialog"
      :current-name="keysStore.activeKey ?? ''"
      @rename="onRename"
      @cancel="showRenameDialog = false"
    />

    <TTLDialog
      v-if="showTTLDialog"
      :visible="showTTLDialog"
      :current-t-t-l="keysStore.activeKeyInfo?.ttl ?? -1"
      @save="onSaveTTL"
      @persist="onPersist"
      @cancel="showTTLDialog = false"
    />
  </div>
</template>
