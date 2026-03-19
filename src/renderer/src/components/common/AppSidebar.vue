<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConnectionStore } from '@renderer/stores/connection.store'
import { useSettingsStore } from '@renderer/stores/settings.store'
import type { ConnectionConfig, ConnectionStatus } from '@shared/types/connection.types'
import { ChevronRight, Plus, Server, Wifi, WifiOff, DatabaseZap, Search, MoreHorizontal, Moon, Sun, Monitor, Plug, Unplug } from 'lucide-vue-next'

defineProps<{
  width?: number
}>()

const emit = defineEmits<{
  (e: 'add-connection'): void
  (e: 'context-menu', event: MouseEvent, connection: ConnectionConfig): void
  (e: 'connection-click', connection: ConnectionConfig): void
  (e: 'connection-connect', connection: ConnectionConfig): void
  (e: 'connection-disconnect', connection: ConnectionConfig): void
}>()

const connectionStore = useConnectionStore()
const settingsStore = useSettingsStore()
const searchQuery = ref('')

function cycleTheme(): void {
  const order = ['dark', 'light', 'system'] as const
  const idx = order.indexOf(settingsStore.theme)
  settingsStore.updateSetting('theme', order[(idx + 1) % order.length])
}

interface GroupedConnections {
  name: string
  expanded: boolean
  connections: ConnectionConfig[]
}

const groupedConnections = computed<GroupedConnections[]>(() => {
  const groups = new Map<string, ConnectionConfig[]>()
  const ungrouped: ConnectionConfig[] = []

  const conns = connectionStore.sortedConnections.filter((c) => {
    if (!searchQuery.value) return true
    return c.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      c.host.toLowerCase().includes(searchQuery.value.toLowerCase())
  })

  for (const conn of conns) {
    if (conn.group) {
      if (!groups.has(conn.group)) {
        groups.set(conn.group, [])
      }
      groups.get(conn.group)!.push(conn)
    } else {
      ungrouped.push(conn)
    }
  }

  const result: GroupedConnections[] = []

  for (const [name, connections] of groups) {
    const groupState = connectionStore.groups.find((g) => g.name === name)
    result.push({
      name,
      expanded: groupState?.expanded ?? true,
      connections
    })
  }

  if (ungrouped.length > 0) {
    result.push({
      name: '',
      expanded: true,
      connections: ungrouped
    })
  }

  return result
})

function getStatus(id: string): ConnectionStatus {
  const state = connectionStore.getConnectionState(id)
  return state?.status ?? 'disconnected'
}

function statusIndicator(status: ConnectionStatus): { color: string; pulse: boolean } {
  switch (status) {
    case 'connected':
      return { color: 'bg-success', pulse: false }
    case 'connecting':
      return { color: 'bg-warning', pulse: true }
    case 'error':
      return { color: 'bg-danger', pulse: false }
    default:
      return { color: 'bg-text-faint', pulse: false }
  }
}

function handleConnectionClick(conn: ConnectionConfig): void {
  emit('connection-click', conn)
}

function handleContextMenu(event: MouseEvent, conn: ConnectionConfig): void {
  event.preventDefault()
  emit('context-menu', event, conn)
}

function connectionTooltip(conn: ConnectionConfig): string {
  const state = connectionStore.getConnectionState(conn.id)
  if (!state || state.status !== 'connected') return `${conn.host}:${conn.port}`

  const parts: string[] = [`${conn.host}:${conn.port}`]
  if (state.serverVersion) parts.push(`Redis ${state.serverVersion}`)
  if (state.usedMemory) parts.push(`Memory: ${state.usedMemory}`)
  if (state.dbSize !== undefined) parts.push(`Keys: ${state.dbSize.toLocaleString()}`)
  if (state.latency !== undefined) parts.push(`Latency: ${state.latency}ms`)
  return parts.join('\n')
}

function toggleGroup(name: string): void {
  connectionStore.toggleGroup(name)
}
</script>

<template>
  <div
    class="flex flex-col h-full bg-sidebar-bg overflow-hidden border-r border-border"
    :style="width ? { width: `${width}px` } : undefined"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-3 pt-3 pb-2">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold uppercase tracking-[0.15em] text-text-muted">Connections</span>
        <span
          v-if="connectionStore.connections.length > 0"
          class="flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full bg-accent-muted text-accent text-xs font-bold"
        >
          {{ connectionStore.connections.length }}
        </span>
      </div>
      <button
        class="btn-icon-sm !w-6 !h-6 text-text-muted hover:text-accent hover:bg-accent-muted"
        title="Add Connection"
        @click="emit('add-connection')"
      >
        <Plus class="w-3.5 h-3.5" :stroke-width="2.5" />
      </button>
    </div>

    <!-- Search -->
    <div class="px-3 pb-2">
      <div class="relative">
        <Search
          class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-faint pointer-events-none"
          :stroke-width="2"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search..."
          class="w-full h-7 pl-8 pr-3 text-xs bg-surface-0/50 border border-border rounded-lg text-text placeholder:text-text-faint
            focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 focus:bg-surface-0
            transition-all duration-200"
        />
      </div>
    </div>

    <!-- Connection list -->
    <div class="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
      <template v-for="group in groupedConnections" :key="group.name || '__ungrouped'">
        <!-- Group header -->
        <div
          v-if="group.name || groupedConnections.some(g => g.name)"
          class="flex items-center gap-1.5 px-2 py-1.5 mt-1 cursor-pointer rounded-md hover:bg-overlay-0/30 select-none transition-colors duration-100"
          @click="group.name ? toggleGroup(group.name) : undefined"
        >
          <ChevronRight
            class="w-3 h-3 text-text-faint transition-transform duration-200"
            :class="{ 'rotate-90': group.expanded }"
            :stroke-width="2.5"
          />
          <span class="text-xs font-bold uppercase tracking-[0.12em] text-text-muted flex-1">
            {{ group.name || 'Ungrouped' }}
          </span>
          <span class="text-xs text-text-faint tabular-nums">{{ group.connections.length }}</span>
        </div>

        <!-- Connections -->
        <transition-group name="conn" tag="div">
          <div
            v-for="conn in group.expanded ? group.connections : []"
            :key="conn.id"
            class="group relative flex items-center gap-2.5 px-2.5 py-2 my-0.5 cursor-pointer rounded-lg transition-all duration-150"
            :class="[
              connectionStore.activeConnectionId === conn.id
                ? 'bg-accent-muted text-accent shadow-sm'
                : 'text-text-secondary hover:bg-overlay-0/40 hover:text-text'
            ]"
            :title="connectionTooltip(conn)"
            @click="handleConnectionClick(conn)"
            @contextmenu="handleContextMenu($event, conn)"
          >
            <!-- Connection icon with status -->
            <div class="relative shrink-0">
              <div
                class="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150"
                :class="[
                  connectionStore.activeConnectionId === conn.id
                    ? 'bg-accent-muted'
                    : 'bg-surface-0/60 group-hover:bg-surface-1'
                ]"
              >
                <Server
                  class="w-4 h-4"
                  :class="[
                    getStatus(conn.id) === 'connected' ? 'text-success' :
                    connectionStore.activeConnectionId === conn.id ? 'text-accent' : 'text-text-muted'
                  ]"
                  :stroke-width="1.75"
                />
              </div>
              <!-- Status dot -->
              <span
                class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar-bg"
                :class="[
                  statusIndicator(getStatus(conn.id)).color,
                  { 'animate-pulse': statusIndicator(getStatus(conn.id)).pulse }
                ]"
              />
            </div>

            <!-- Connection info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs truncate block font-medium leading-tight">{{ conn.name }}</span>
                <!-- Color dot -->
                <span
                  v-if="conn.color"
                  class="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/10"
                  :style="{ backgroundColor: conn.color }"
                />
              </div>
              <span class="text-xs text-text-faint truncate block mt-0.5 leading-tight">
                {{ conn.host }}:{{ conn.port }}
              </span>
              <span
                v-if="getStatus(conn.id) === 'connected' && connectionStore.getConnectionState(conn.id)?.serverVersion"
                class="text-xs text-success/70 truncate block leading-tight"
              >
                v{{ connectionStore.getConnectionState(conn.id)?.serverVersion }}
                <template v-if="connectionStore.getConnectionState(conn.id)?.usedMemory">
                  &middot; {{ connectionStore.getConnectionState(conn.id)?.usedMemory }}
                </template>
              </span>
            </div>

            <!-- Actions -->
            <div class="shrink-0 flex items-center gap-0.5">
              <!-- Connect/Disconnect button -->
              <button
                v-if="getStatus(conn.id) === 'connected'"
                class="btn-icon-sm !w-6 !h-6 text-success hover:text-danger hover:bg-danger-muted transition-colors duration-150"
                title="Disconnect"
                @click.stop="emit('connection-disconnect', conn)"
              >
                <Unplug class="w-3.5 h-3.5" :stroke-width="2" />
              </button>
              <button
                v-else-if="getStatus(conn.id) !== 'connecting'"
                class="btn-icon-sm !w-6 !h-6 text-text-faint opacity-0 group-hover:opacity-100 hover:text-success hover:bg-accent-subtle transition-all duration-150"
                title="Connect"
                @click.stop="emit('connection-connect', conn)"
              >
                <Plug class="w-3.5 h-3.5" :stroke-width="2" />
              </button>
              <!-- Context menu button -->
              <button
                class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 btn-icon-sm !w-6 !h-6"
                @click.stop="handleContextMenu($event, conn)"
              >
                <MoreHorizontal class="w-3.5 h-3.5" :stroke-width="2" />
              </button>
            </div>
          </div>
        </transition-group>
      </template>

      <!-- Empty state -->
      <div
        v-if="connectionStore.connections.length === 0"
        class="flex flex-col items-center justify-center px-4 py-16 text-center"
      >
        <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-subtle mb-5">
          <DatabaseZap class="w-8 h-8 text-accent/40" :stroke-width="1.5" />
        </div>
        <span class="text-md font-medium text-text-secondary mb-1">No connections yet</span>
        <span class="text-xs text-text-muted leading-relaxed max-w-[180px]">
          Add your first Redis connection to get started
        </span>
        <button
          class="mt-4 btn-primary !text-xs !px-4 !py-2"
          @click="emit('add-connection')"
        >
          <Plus class="w-3.5 h-3.5" :stroke-width="2.5" />
          Add Connection
        </button>
      </div>

      <!-- No search results -->
      <div
        v-else-if="groupedConnections.length === 0 && searchQuery"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <Search class="w-8 h-8 text-text-faint mb-3" :stroke-width="1.5" />
        <span class="text-xs text-text-muted">No connections match "{{ searchQuery }}"</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="p-2.5 border-t border-border space-y-2">
      <!-- Theme toggle -->
      <div class="flex items-center gap-1 bg-overlay-0/30 rounded-lg p-0.5">
        <button
          class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
          :class="settingsStore.theme === 'dark'
            ? 'bg-surface-0 text-accent shadow-sm'
            : 'text-text-muted hover:text-text'"
          @click="settingsStore.updateSetting('theme', 'dark')"
        >
          <Moon class="w-3 h-3" :stroke-width="2" />
          Dark
        </button>
        <button
          class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
          :class="settingsStore.theme === 'light'
            ? 'bg-surface-0 text-accent shadow-sm'
            : 'text-text-muted hover:text-text'"
          @click="settingsStore.updateSetting('theme', 'light')"
        >
          <Sun class="w-3 h-3" :stroke-width="2" />
          Light
        </button>
        <button
          class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
          :class="settingsStore.theme === 'system'
            ? 'bg-surface-0 text-accent shadow-sm'
            : 'text-text-muted hover:text-text'"
          @click="settingsStore.updateSetting('theme', 'system')"
        >
          <Monitor class="w-3 h-3" :stroke-width="2" />
          Auto
        </button>
      </div>

      <!-- Add connection -->
      <button
        class="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-text-muted
          border border-dashed border-border hover:border-accent/30 hover:bg-accent-subtle hover:text-accent
          rounded-lg transition-all duration-200"
        @click="emit('add-connection')"
      >
        <Plus class="w-3.5 h-3.5" :stroke-width="2" />
        New Connection
      </button>
    </div>
  </div>
</template>

<style scoped>
.conn-enter-active,
.conn-leave-active {
  transition: all 0.2s ease;
}

.conn-enter-from,
.conn-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
