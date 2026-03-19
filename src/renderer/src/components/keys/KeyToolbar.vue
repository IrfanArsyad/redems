<script setup lang="ts">
import { ref, computed } from 'vue'
import { useKeysStore } from '@renderer/stores/keys.store'
import AddKeyDialog from './dialogs/AddKeyDialog.vue'
import BulkDeleteDialog from './dialogs/BulkDeleteDialog.vue'
import DatabaseSelector from '../server/DatabaseSelector.vue'
import { Search, RefreshCw, Plus, Trash2, List, TreePine, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const keysStore = useKeysStore()

const searchInput = ref(keysStore.searchPattern === '*' ? '' : keysStore.searchPattern)
const showAddKey = ref(false)
const showBulkDelete = ref(false)

const typeOptions = [
  { label: 'All Types', value: '' },
  { label: 'String', value: 'string' },
  { label: 'Hash', value: 'hash' },
  { label: 'List', value: 'list' },
  { label: 'Set', value: 'set' },
  { label: 'ZSet', value: 'zset' },
  { label: 'Stream', value: 'stream' }
]

const keyCountText = computed(() => {
  const count = keysStore.keyCount
  if (keysStore.hasMore) return `${count}+`
  return `${count}`
})

function onSearch(): void {
  const pattern = searchInput.value.trim()
  keysStore.setSearchPattern(pattern ? (pattern.includes('*') ? pattern : `*${pattern}*`) : '*')
  keysStore.scanKeys(props.connectionId, true)
}

function onTypeFilterChange(e: Event): void {
  const value = (e.target as HTMLSelectElement).value
  keysStore.setTypeFilter(value)
  keysStore.scanKeys(props.connectionId, true)
}

function onRefresh(): void {
  keysStore.scanKeys(props.connectionId, true)
}

function onToggleViewMode(): void {
  keysStore.setViewMode(keysStore.viewMode === 'tree' ? 'list' : 'tree')
}

function onDbSelect(db: number): void {
  keysStore.selectDb(props.connectionId, db)
}

async function onAddKeyCreate(
  key: string,
  type: string,
  value: unknown,
  ttl?: number
): Promise<void> {
  await keysStore.createKey(props.connectionId, key, type as any, value, ttl)
  showAddKey.value = false
}

async function onBulkDeleteConfirm(): Promise<void> {
  const keysToDelete = Array.from(keysStore.selectedKeys)
  await keysStore.deleteKeys(props.connectionId, keysToDelete)
  showBulkDelete.value = false
}
</script>

<template>
  <div class="flex items-center gap-2 px-3 py-2 bg-surface-0 border-b border-border flex-shrink-0">
    <!-- Search input -->
    <div class="relative flex-1 max-w-[260px]">
      <Search
        class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-faint pointer-events-none"
        :stroke-width="2"
      />
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search keys..."
        class="input-sm !pl-8 !pr-2"
        @keydown.enter="onSearch"
      />
    </div>

    <!-- Type filter -->
    <select
      :value="keysStore.typeFilter"
      class="h-8 px-2.5 text-xs bg-input-bg border border-border rounded-md text-text-secondary
        focus:outline-none focus:ring-1 focus:ring-accent/20 focus:border-accent/40 cursor-pointer transition-all"
      @change="onTypeFilterChange"
    >
      <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <!-- DB Selector -->
    <DatabaseSelector
      :connection-id="connectionId"
      :current-db="keysStore.currentDb"
      @select="onDbSelect"
    />

    <span class="divider-v" />

    <!-- View mode toggle -->
    <button
      class="btn-icon-sm"
      :title="keysStore.viewMode === 'tree' ? 'Switch to List View' : 'Switch to Tree View'"
      @click="onToggleViewMode"
    >
      <TreePine
        v-if="keysStore.viewMode === 'list'"
        class="w-4 h-4"
        :stroke-width="1.75"
      />
      <List
        v-else
        class="w-4 h-4"
        :stroke-width="1.75"
      />
    </button>

    <!-- Refresh -->
    <button
      class="btn-icon-sm"
      title="Refresh"
      :disabled="keysStore.loading"
      @click="onRefresh"
    >
      <Loader2
        v-if="keysStore.loading"
        class="w-4 h-4 animate-spin text-accent"
        :stroke-width="2"
      />
      <RefreshCw
        v-else
        class="w-4 h-4"
        :stroke-width="1.75"
      />
    </button>

    <!-- Add key -->
    <button
      class="btn-icon-sm !text-accent hover:!bg-accent-muted"
      title="Add Key"
      @click="showAddKey = true"
    >
      <Plus class="w-4 h-4" :stroke-width="2.5" />
    </button>

    <!-- Delete selected -->
    <button
      v-if="keysStore.hasSelection"
      class="flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md bg-danger-muted text-danger hover:bg-danger/20 transition-colors"
      title="Delete Selected"
      @click="showBulkDelete = true"
    >
      <Trash2 class="w-3.5 h-3.5" :stroke-width="2" />
      <span>{{ keysStore.selectedCount }}</span>
    </button>

    <span class="divider-v" />

    <!-- Key count -->
    <span class="text-xs text-text-faint whitespace-nowrap tabular-nums font-medium">
      {{ keyCountText }} keys
    </span>
  </div>

  <!-- Dialogs -->
  <AddKeyDialog
    v-if="showAddKey"
    :visible="showAddKey"
    @create="onAddKeyCreate"
    @cancel="showAddKey = false"
  />

  <BulkDeleteDialog
    v-if="showBulkDelete"
    :visible="showBulkDelete"
    :count="keysStore.selectedCount"
    @confirm="onBulkDeleteConfirm"
    @cancel="showBulkDelete = false"
  />
</template>
