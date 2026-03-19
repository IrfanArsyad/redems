<script setup lang="ts">
import { computed } from 'vue'
import type { ConnectionConfig, ConnectionState } from '@shared/types/connection.types'
import { useUiStore } from '@renderer/stores/ui.store'
import { AlertTriangle } from 'lucide-vue-next'

const props = defineProps<{
  connection: ConnectionConfig
  state: ConnectionState | undefined
}>()

const emit = defineEmits<{
  connect: [id: string]
  edit: [id: string]
  duplicate: [id: string]
  delete: [id: string]
}>()

const uiStore = useUiStore()

const status = computed(() => props.state?.status ?? 'disconnected')

const statusColor = computed(() => {
  switch (status.value) {
    case 'connected':
      return 'bg-success'
    case 'connecting':
      return 'bg-warning'
    case 'error':
      return 'bg-danger'
    default:
      return 'bg-overlay-0'
  }
})

const hostPort = computed(() => `${props.connection.host}:${props.connection.port}`)

function handleClick() {
  emit('connect', props.connection.id)
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()

  const isConnected = status.value === 'connected'

  uiStore.showContextMenu(e.clientX, e.clientY, [
    {
      label: isConnected ? 'Disconnect' : 'Connect',
      action: () => emit('connect', props.connection.id),
      icon: isConnected ? 'disconnect' : 'connect'
    },
    {
      label: 'Edit',
      action: () => emit('edit', props.connection.id),
      icon: 'edit'
    },
    {
      label: 'Duplicate',
      action: () => emit('duplicate', props.connection.id),
      icon: 'duplicate'
    },
    {
      label: '',
      action: () => {},
      separator: true
    },
    {
      label: 'Delete',
      action: () => emit('delete', props.connection.id),
      icon: 'delete',
      danger: true
    }
  ])
}
</script>

<template>
  <div
    class="group flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-overlay-0"
    :class="{ 'bg-overlay-0': status === 'connected' }"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <!-- Status dot with optional user color ring -->
    <div class="relative flex-shrink-0">
      <span
        class="block h-2.5 w-2.5 rounded-full"
        :class="statusColor"
        :style="connection.color ? { boxShadow: `0 0 0 2px ${connection.color}` } : undefined"
      />
      <!-- Pulse animation when connecting -->
      <span
        v-if="status === 'connecting'"
        class="absolute inset-0 animate-ping rounded-full bg-warning opacity-50"
      />
    </div>

    <!-- Connection info -->
    <div class="min-w-0 flex-1">
      <div class="truncate text-md font-medium text-text">
        {{ connection.name }}
      </div>
      <div class="truncate text-xs text-text-muted">
        {{ hostPort }}
        <template v-if="connection.db > 0">
          &middot; db{{ connection.db }}
        </template>
        <template v-if="connection.mode !== 'standalone'">
          &middot; {{ connection.mode }}
        </template>
      </div>
    </div>

    <!-- Connected state extra info -->
    <div
      v-if="status === 'connected' && state"
      class="flex-shrink-0 text-right"
    >
      <div v-if="state.serverVersion" class="text-xs text-text-muted">
        v{{ state.serverVersion }}
      </div>
      <div v-if="state.usedMemory" class="text-xs text-text-muted">
        {{ state.usedMemory }}
      </div>
    </div>

    <!-- Error indicator -->
    <div
      v-else-if="status === 'error'"
      class="flex-shrink-0"
      :title="state?.error"
    >
      <AlertTriangle class="h-3.5 w-3.5 text-danger" :stroke-width="2" />
    </div>
  </div>
</template>
