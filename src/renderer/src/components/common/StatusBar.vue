<script setup lang="ts">
import { computed } from 'vue'
import { useConnectionStore } from '@renderer/stores/connection.store'
import { useTheme } from '@renderer/composables/useTheme'
import { Circle, Database, Key, Clock, HardDrive, Sun, Moon, Settings } from 'lucide-vue-next'

const connectionStore = useConnectionStore()
const { isDark, toggleTheme } = useTheme()

const emit = defineEmits<{
  (e: 'open-settings'): void
}>()

const connectionName = computed(() => connectionStore.activeConnection?.name ?? '')

const currentDb = computed(() => {
  const conn = connectionStore.activeConnection
  return conn ? `db${conn.db}` : ''
})

const keyCount = computed(() => {
  const state = connectionStore.activeConnectionState
  if (state?.dbSize !== undefined) {
    return state.dbSize.toLocaleString()
  }
  return ''
})

const latency = computed(() => {
  const state = connectionStore.activeConnectionState
  if (state?.latency !== undefined) {
    return `${state.latency}ms`
  }
  return ''
})

const memoryUsage = computed(() => {
  const state = connectionStore.activeConnectionState
  return state?.usedMemory ?? ''
})

const isConnected = computed(() => {
  return connectionStore.activeConnectionState?.status === 'connected'
})
</script>

<template>
  <div class="flex items-center h-6 px-3 bg-statusbar-bg border-t border-border text-xs select-none">
    <!-- Left side info -->
    <div class="flex items-center gap-1 flex-1 min-w-0">
      <template v-if="isConnected">
        <Circle class="w-[6px] h-[6px] text-success fill-success shrink-0" :stroke-width="0" />
        <span class="text-text-secondary truncate ml-0.5 font-medium">{{ connectionName }}</span>

        <span class="divider-v !h-3 !mx-2" />

        <Database class="w-3 h-3 text-text-faint shrink-0" :stroke-width="1.75" />
        <span class="text-text-muted ml-0.5">{{ currentDb }}</span>

        <template v-if="keyCount">
          <span class="divider-v !h-3 !mx-2" />
          <Key class="w-3 h-3 text-text-faint shrink-0" :stroke-width="1.75" />
          <span class="text-text-muted ml-0.5">{{ keyCount }} keys</span>
        </template>

        <template v-if="latency">
          <span class="divider-v !h-3 !mx-2" />
          <Clock class="w-3 h-3 text-text-faint shrink-0" :stroke-width="1.75" />
          <span class="text-text-muted ml-0.5">{{ latency }}</span>
        </template>

        <template v-if="memoryUsage">
          <span class="divider-v !h-3 !mx-2" />
          <HardDrive class="w-3 h-3 text-text-faint shrink-0" :stroke-width="1.75" />
          <span class="text-text-muted ml-0.5">{{ memoryUsage }}</span>
        </template>
      </template>

      <template v-else>
        <Circle class="w-[6px] h-[6px] text-text-faint fill-text-faint shrink-0" :stroke-width="0" />
        <span class="ml-1 text-text-faint">Disconnected</span>
      </template>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-0.5 shrink-0">
      <button
        class="flex items-center justify-center w-5 h-5 rounded hover:bg-overlay-0/50 transition-colors duration-150"
        @click="toggleTheme"
        :title="isDark ? 'Light mode' : 'Dark mode'"
      >
        <Sun v-if="isDark" class="w-3 h-3 text-text-faint hover:text-text-muted" :stroke-width="1.75" />
        <Moon v-else class="w-3 h-3 text-text-faint hover:text-text-muted" :stroke-width="1.75" />
      </button>

      <button
        class="flex items-center justify-center w-5 h-5 rounded hover:bg-overlay-0/50 transition-colors duration-150"
        @click="emit('open-settings')"
        title="Settings"
      >
        <Settings class="w-3 h-3 text-text-faint hover:text-text-muted" :stroke-width="1.75" />
      </button>
    </div>
  </div>
</template>
