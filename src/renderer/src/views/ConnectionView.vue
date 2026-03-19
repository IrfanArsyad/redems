<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConnectionStore } from '@renderer/stores/connection.store'
import type { ConnectionConfig } from '@shared/types/connection.types'
import ConnectionForm from '@renderer/components/connection/ConnectionForm.vue'
import { Search, Plus, Server, IdCard, FolderOpen, Play, SquarePen, Trash2, Database } from 'lucide-vue-next'

const connectionStore = useConnectionStore()
const searchQuery = ref('')
const sortBy = ref<'name' | 'lastUsed'>('name')
const showForm = ref(false)
const editingConnection = ref<ConnectionConfig | null>(null)
const formRef = ref<InstanceType<typeof ConnectionForm> | null>(null)

onMounted(() => {
  connectionStore.loadConnections()
})

const filteredConnections = computed(() => {
  let conns = [...connectionStore.connections]

  // Filter by search query
  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    conns = conns.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.host.toLowerCase().includes(query) ||
        (c.group && c.group.toLowerCase().includes(query))
    )
  }

  // Sort
  if (sortBy.value === 'name') {
    conns.sort((a, b) => a.name.localeCompare(b.name))
  } else {
    conns.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  return conns
})

function handleAddConnection() {
  editingConnection.value = null
  showForm.value = true
}

function handleEditConnection(conn: ConnectionConfig) {
  editingConnection.value = conn
  showForm.value = true
}

async function handleDeleteConnection(id: string) {
  // Simple confirmation
  if (confirm('Are you sure you want to delete this connection?')) {
    await connectionStore.deleteConnection(id)
  }
}

async function handleConnect(id: string) {
  try {
    await connectionStore.connect(id)
  } catch {
    // Error handled in store
  }
}

async function handleSave(config: ConnectionConfig) {
  try {
    await connectionStore.saveConnection(config)
    showForm.value = false
    editingConnection.value = null
  } catch {
    // Error handled in store
  }
}

async function handleTest(config: ConnectionConfig) {
  const result = await connectionStore.testConnection(config)
  formRef.value?.setTestResult(result)
}

function handleCancelForm() {
  showForm.value = false
  editingConnection.value = null
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

function getStatusLabel(id: string): string {
  const state = connectionStore.getConnectionState(id)
  return state?.status ?? 'disconnected'
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="flex h-full flex-col bg-base">
    <!-- Top bar -->
    <div class="flex items-center justify-between border-b border-border px-6 py-4">
      <h1 class="text-lg font-semibold text-text">Connections</h1>
      <div class="flex items-center gap-3">
        <!-- Search -->
        <div class="relative">
          <Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" :stroke-width="2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search connections..."
            class="w-64 rounded-md border border-border bg-input-bg py-1.5 pl-8 pr-3 text-md text-text placeholder-muted outline-none focus:border-accent"
          />
        </div>

        <!-- Sort selector -->
        <select
          v-model="sortBy"
          class="rounded-md border border-border bg-input-bg px-3 py-1.5 text-md text-text outline-none focus:border-accent"
        >
          <option value="name">Sort by Name</option>
          <option value="lastUsed">Sort by Last Used</option>
        </select>

        <!-- Add button -->
        <button
          class="flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-md font-medium text-white transition-colors hover:bg-accent-hover"
          @click="handleAddConnection"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          Add Connection
        </button>
      </div>
    </div>

    <!-- Connection grid -->
    <div class="scrollbar-thin flex-1 overflow-y-auto p-6">
      <div
        v-if="filteredConnections.length > 0"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="conn in filteredConnections"
          :key="conn.id"
          class="group relative flex flex-col rounded-lg border border-border bg-surface-0 p-4 transition-colors hover:border-accent/50"
        >
          <!-- Header row: status dot + name -->
          <div class="mb-2 flex items-start justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <span
                class="mt-0.5 block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                :class="getStatusColor(conn.id)"
              />
              <h3 class="truncate text-md font-semibold text-text">{{ conn.name }}</h3>
            </div>
            <span
              class="flex-shrink-0 rounded-full px-2 py-0.5 text-xs capitalize"
              :class="{
                'bg-success/10 text-success': getStatusLabel(conn.id) === 'connected',
                'bg-warning/10 text-warning': getStatusLabel(conn.id) === 'connecting',
                'bg-danger/10 text-danger': getStatusLabel(conn.id) === 'error',
                'bg-overlay-0 text-text-muted': getStatusLabel(conn.id) === 'disconnected'
              }"
            >
              {{ getStatusLabel(conn.id) }}
            </span>
          </div>

          <!-- Connection details -->
          <div class="mb-3 space-y-1 text-xs text-text-muted">
            <div class="flex items-center gap-1.5">
              <Server class="h-3 w-3" :stroke-width="2" />
              <span>{{ conn.host }}:{{ conn.port }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <IdCard class="h-3 w-3" :stroke-width="2" />
              <span>{{ conn.mode }} &middot; db{{ conn.db }}</span>
            </div>
            <div v-if="conn.group" class="flex items-center gap-1.5">
              <FolderOpen class="h-3 w-3" :stroke-width="2" />
              <span>{{ conn.group }}</span>
            </div>
            <div v-if="conn.ssh.enabled" class="text-xs text-info">SSH Tunnel</div>
            <div v-if="conn.ssl.enabled" class="text-xs text-info">SSL/TLS</div>
          </div>

          <div class="mt-auto text-xs text-text-muted">
            Updated {{ formatDate(conn.updatedAt) }}
          </div>

          <!-- Action buttons on hover -->
          <div class="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              class="rounded p-1 text-text-muted transition-colors hover:bg-overlay-0 hover:text-accent"
              title="Connect"
              @click.stop="handleConnect(conn.id)"
            >
              <Play class="h-3.5 w-3.5" :stroke-width="2" />
            </button>
            <button
              class="rounded p-1 text-text-muted transition-colors hover:bg-overlay-0 hover:text-text"
              title="Edit"
              @click.stop="handleEditConnection(conn)"
            >
              <SquarePen class="h-3.5 w-3.5" :stroke-width="2" />
            </button>
            <button
              class="rounded p-1 text-text-muted transition-colors hover:bg-overlay-0 hover:text-danger"
              title="Delete"
              @click.stop="handleDeleteConnection(conn.id)"
            >
              <Trash2 class="h-3.5 w-3.5" :stroke-width="2" />
            </button>
          </div>

          <!-- Color accent bar at left -->
          <div
            v-if="conn.color"
            class="absolute bottom-3 left-0 top-3 w-1 rounded-r"
            :style="{ backgroundColor: conn.color }"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="flex flex-col items-center gap-4 py-16 text-center"
      >
        <Database class="h-16 w-16 text-text-muted/50" :stroke-width="1" />
        <div>
          <h2 class="text-base font-medium text-text">No connections found</h2>
          <p class="mt-1 text-md text-text-muted">
            {{ searchQuery ? 'Try a different search term' : 'Create your first Redis connection to get started' }}
          </p>
        </div>
        <button
          v-if="!searchQuery"
          class="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-md font-medium text-white transition-colors hover:bg-accent-hover"
          @click="handleAddConnection"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          Add Connection
        </button>
      </div>
    </div>

    <!-- Connection form modal -->
    <ConnectionForm
      ref="formRef"
      :connection="editingConnection"
      :visible="showForm"
      @save="handleSave"
      @cancel="handleCancelForm"
      @test="handleTest"
    />
  </div>
</template>
