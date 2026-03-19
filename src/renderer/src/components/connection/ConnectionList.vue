<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConnectionStore } from '@renderer/stores/connection.store'
import ConnectionCard from './ConnectionCard.vue'
import { Search, ChevronDown, Database, Plus } from 'lucide-vue-next'

const emit = defineEmits<{
  connect: [id: string]
  edit: [id: string]
  delete: [id: string]
  'new-connection': []
}>()

const connectionStore = useConnectionStore()
const searchQuery = ref('')

// Group connections: ungrouped first, then by group name
const filteredConnections = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return connectionStore.connections
  return connectionStore.connections.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.host.toLowerCase().includes(query) ||
      (c.group && c.group.toLowerCase().includes(query))
  )
})

const ungroupedConnections = computed(() =>
  filteredConnections.value.filter((c) => !c.group)
)

const groupedConnections = computed(() => {
  const groups = new Map<string, typeof filteredConnections.value>()
  for (const conn of filteredConnections.value) {
    if (conn.group) {
      const list = groups.get(conn.group) || []
      list.push(conn)
      groups.set(conn.group, list)
    }
  }
  return groups
})

const collapsedGroups = ref<Set<string>>(new Set())

function toggleGroup(groupName: string) {
  if (collapsedGroups.value.has(groupName)) {
    collapsedGroups.value.delete(groupName)
  } else {
    collapsedGroups.value.add(groupName)
  }
}

function isGroupCollapsed(groupName: string): boolean {
  return collapsedGroups.value.has(groupName)
}

function handleConnect(id: string) {
  emit('connect', id)
}

function handleEdit(id: string) {
  emit('edit', id)
}

function handleDuplicate(id: string) {
  // Duplicate is handled at a higher level; re-emit as edit with duplicate intent
  // For now we surface it through the edit flow
  emit('edit', id)
}

function handleDelete(id: string) {
  emit('delete', id)
}
</script>

<template>
  <div class="flex h-full flex-col bg-sidebar-bg">
    <!-- Search bar -->
    <div class="border-b border-border p-2">
      <div class="relative">
        <Search class="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" :stroke-width="2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter connections..."
          class="w-full rounded border border-border bg-input-bg py-1.5 pl-7 pr-2 text-xs text-text placeholder-muted outline-none focus:border-accent"
        />
      </div>
    </div>

    <!-- Connection list -->
    <div class="scrollbar-thin flex-1 overflow-y-auto px-1 py-1">
      <!-- Ungrouped connections -->
      <template v-if="ungroupedConnections.length > 0">
        <div class="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Connections
        </div>
        <ConnectionCard
          v-for="conn in ungroupedConnections"
          :key="conn.id"
          :connection="conn"
          :state="connectionStore.getConnectionState(conn.id)"
          @connect="handleConnect"
          @edit="handleEdit"
          @duplicate="handleDuplicate"
          @delete="handleDelete"
        />
      </template>

      <!-- Grouped connections -->
      <template v-for="[groupName, conns] in groupedConnections" :key="groupName">
        <button
          class="mt-1 flex w-full items-center gap-1 px-2 py-1.5 text-left"
          @click="toggleGroup(groupName)"
        >
          <ChevronDown
            class="h-3 w-3 text-text-muted transition-transform"
            :class="{ '-rotate-90': isGroupCollapsed(groupName) }"
            :stroke-width="2"
          />
          <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {{ groupName }}
          </span>
          <span class="text-xs text-text-muted">({{ conns.length }})</span>
        </button>
        <template v-if="!isGroupCollapsed(groupName)">
          <ConnectionCard
            v-for="conn in conns"
            :key="conn.id"
            :connection="conn"
            :state="connectionStore.getConnectionState(conn.id)"
            @connect="handleConnect"
            @edit="handleEdit"
            @duplicate="handleDuplicate"
            @delete="handleDelete"
          />
        </template>
      </template>

      <!-- Empty state -->
      <div
        v-if="filteredConnections.length === 0"
        class="flex flex-col items-center gap-2 px-4 py-8 text-center"
      >
        <Database class="h-8 w-8 text-text-muted" :stroke-width="1.5" />
        <p class="text-xs text-text-muted">
          {{ searchQuery ? 'No matching connections' : 'No connections yet' }}
        </p>
      </div>
    </div>

    <!-- New Connection button -->
    <div class="border-t border-border p-2">
      <button
        class="flex w-full items-center justify-center gap-1.5 rounded border border-border bg-surface-0 px-3 py-1.5 text-xs text-text transition-colors hover:border-accent hover:text-accent"
        @click="emit('new-connection')"
      >
        <Plus class="h-3.5 w-3.5" :stroke-width="2" />
        New Connection
      </button>
    </div>
  </div>
</template>
