<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '@renderer/stores/connection.store'
import { Database, Plus, Upload, ChevronRight } from 'lucide-vue-next'

const router = useRouter()
const connectionStore = useConnectionStore()

// Recent connections: last 5 sorted by updatedAt descending
const recentConnections = computed(() => {
  return [...connectionStore.connections]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)
})

function handleNewConnection() {
  router.push({ name: 'connections' })
}

function handleImportConnection() {
  // Placeholder for import functionality
  router.push({ name: 'connections' })
}

async function handleQuickConnect(id: string) {
  try {
    await connectionStore.connect(id)
    router.push({ name: 'workspace', params: { id } })
  } catch {
    // Error is already handled in the store
  }
}

function getStatusColor(id: string): string {
  const state = connectionStore.getConnectionState(id)
  switch (state?.status) {
    case 'connected':
      return 'bg-success'
    case 'connecting':
      return 'bg-warning'
    case 'error':
      return 'bg-danger'
    default:
      return 'bg-overlay-0'
  }
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center bg-base">
    <div class="flex max-w-md flex-col items-center gap-8 px-6">
      <!-- Logo / Icon -->
      <div class="flex flex-col items-center gap-3">
        <Database class="h-20 w-20 text-accent" :stroke-width="1.5" />
        <h1 class="text-2xl font-semibold text-text">Welcome to Redis Manager</h1>
        <p class="text-center text-md text-text-muted">
          A modern Redis GUI for browsing, editing, and managing your Redis databases.
        </p>
      </div>

      <!-- Quick actions -->
      <div class="flex gap-3">
        <button
          class="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-md font-medium text-white transition-colors hover:bg-accent-hover"
          @click="handleNewConnection"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          New Connection
        </button>
        <button
          class="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-md text-text-muted transition-colors hover:border-border-accent hover:text-text"
          @click="handleImportConnection"
        >
          <Upload class="h-4 w-4" :stroke-width="2" />
          Import
        </button>
      </div>

      <!-- Recent connections -->
      <div v-if="recentConnections.length > 0" class="w-full">
        <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Recent Connections
        </h2>
        <div class="space-y-1">
          <button
            v-for="conn in recentConnections"
            :key="conn.id"
            class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-0"
            @click="handleQuickConnect(conn.id)"
          >
            <span
              class="block h-2 w-2 flex-shrink-0 rounded-full"
              :class="getStatusColor(conn.id)"
            />
            <div class="min-w-0 flex-1">
              <div class="truncate text-md text-text">{{ conn.name }}</div>
              <div class="truncate text-xs text-text-muted">{{ conn.host }}:{{ conn.port }}</div>
            </div>
            <ChevronRight class="h-4 w-4 flex-shrink-0 text-text-muted" :stroke-width="2" />
          </button>
        </div>
      </div>
    </div>

    <!-- Version info -->
    <div class="absolute bottom-4 text-xs text-text-muted">
      Redis Manager v1.0.0
    </div>
  </div>
</template>
