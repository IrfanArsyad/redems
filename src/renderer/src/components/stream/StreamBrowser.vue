<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useStreamStore } from '@renderer/stores/stream.store'
import StreamEntryViewer from '@renderer/components/stream/StreamEntryViewer.vue'
import type { RedisStreamEntry } from '@shared/types/redis.types'
import { Plus, RefreshCw, Minus, Activity, ChevronRight, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
  keyName: string
}>()

const streamStore = useStreamStore()
const expandedEntryId = ref<string | null>(null)
const showAddForm = ref<boolean>(false)
const pageSize = ref<number>(50)
const direction = ref<'oldest' | 'newest'>('newest')

// Add entry form state
const newEntryId = ref<string>('*')
const newEntryFields = ref<Array<{ field: string; value: string }>>([
  { field: '', value: '' }
])

onMounted(async () => {
  await refresh()
})

async function refresh(): Promise<void> {
  await Promise.all([
    streamStore.fetchInfo(props.connectionId, props.keyName),
    loadEntries()
  ])
}

async function loadEntries(): Promise<void> {
  if (direction.value === 'newest') {
    await streamStore.fetchEntries(props.connectionId, props.keyName, '-', '+', pageSize.value)
    // Reverse for newest-first display
    streamStore.entries.reverse()
  } else {
    await streamStore.fetchEntries(props.connectionId, props.keyName, '-', '+', pageSize.value)
  }
}

async function loadNewest(): Promise<void> {
  direction.value = 'newest'
  await loadEntries()
}

async function loadOldest(): Promise<void> {
  direction.value = 'oldest'
  await loadEntries()
}

async function loadPageForward(): Promise<void> {
  if (streamStore.entries.length === 0) return
  const lastEntry = direction.value === 'newest'
    ? streamStore.entries[streamStore.entries.length - 1]
    : streamStore.entries[streamStore.entries.length - 1]
  if (!lastEntry) return

  // Use the last entry ID as the start for the next page (exclusive)
  const nextId = incrementId(lastEntry.id)
  await streamStore.fetchEntries(props.connectionId, props.keyName, nextId, '+', pageSize.value)
}

async function loadPageBack(): Promise<void> {
  if (streamStore.entries.length === 0) return
  const firstEntry = streamStore.entries[0]
  if (!firstEntry) return

  const prevId = decrementId(firstEntry.id)
  await streamStore.fetchEntries(props.connectionId, props.keyName, '-', prevId, pageSize.value)
}

function incrementId(id: string): string {
  const parts = id.split('-')
  if (parts.length === 2) {
    const seq = parseInt(parts[1], 10)
    return `${parts[0]}-${seq + 1}`
  }
  return id
}

function decrementId(id: string): string {
  const parts = id.split('-')
  if (parts.length === 2) {
    const seq = parseInt(parts[1], 10)
    if (seq > 0) return `${parts[0]}-${seq - 1}`
    return `${parseInt(parts[0], 10) - 1}-999999`
  }
  return id
}

function toggleExpand(entryId: string): void {
  expandedEntryId.value = expandedEntryId.value === entryId ? null : entryId
}

async function deleteEntry(entry: RedisStreamEntry): Promise<void> {
  if (!confirm(`Delete stream entry ${entry.id}?`)) return
  await streamStore.deleteEntries(props.connectionId, props.keyName, [entry.id])
  await refresh()
}

// Add entry form
function addField(): void {
  newEntryFields.value.push({ field: '', value: '' })
}

function removeField(index: number): void {
  if (newEntryFields.value.length > 1) {
    newEntryFields.value.splice(index, 1)
  }
}

const canAdd = computed<boolean>(() => {
  return newEntryFields.value.some((f) => f.field.trim() !== '')
})

async function submitEntry(): Promise<void> {
  const fields: Record<string, string> = {}
  for (const f of newEntryFields.value) {
    if (f.field.trim()) {
      fields[f.field.trim()] = f.value
    }
  }
  if (Object.keys(fields).length === 0) return

  await streamStore.addEntry(props.connectionId, props.keyName, fields, newEntryId.value || '*')

  // Reset form
  newEntryId.value = '*'
  newEntryFields.value = [{ field: '', value: '' }]
  showAddForm.value = false
  await refresh()
}

function cancelAdd(): void {
  showAddForm.value = false
  newEntryId.value = '*'
  newEntryFields.value = [{ field: '', value: '' }]
}

function fieldCount(entry: RedisStreamEntry): number {
  return Object.keys(entry.fields).length
}
</script>

<template>
  <div class="flex flex-col h-full bg-base">
    <!-- Stream Info Header -->
    <div class="flex items-center gap-4 px-4 py-2 border-b border-border bg-surface-0">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-text">{{ props.keyName }}</span>
        <span class="px-1.5 py-0.5 text-xs bg-danger-muted text-danger rounded">STREAM</span>
      </div>

      <div v-if="streamStore.streamInfo" class="flex items-center gap-3 text-xs text-text-muted">
        <span>Length: <span class="text-text tabular-nums">{{ streamStore.streamInfo.length.toLocaleString() }}</span></span>
        <span>Groups: <span class="text-text tabular-nums">{{ streamStore.streamInfo.groups }}</span></span>
        <span>Last ID: <span class="text-text font-mono">{{ streamStore.streamInfo.lastGeneratedId }}</span></span>
      </div>

      <div class="flex-1" />

      <!-- Add Entry Button -->
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-success-muted text-success hover:bg-success/25 transition-colors"
        @click="showAddForm = !showAddForm"
      >
        <Plus class="w-3.5 h-3.5" :stroke-width="1.5" />
        Add Entry
      </button>

      <!-- Refresh -->
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text hover:bg-overlay-0/50 rounded transition-colors"
        :class="{ 'animate-spin': streamStore.loading }"
        @click="refresh"
      >
        <RefreshCw class="w-3.5 h-3.5" :stroke-width="1.5" />
      </button>
    </div>

    <!-- Add Entry Form -->
    <div v-if="showAddForm" class="border-b border-border bg-surface-0/50 p-4">
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <label class="text-xs text-text-muted w-12">ID:</label>
          <input
            v-model="newEntryId"
            type="text"
            placeholder="* (auto-generate)"
            class="w-48 px-2 py-1 text-xs bg-input-bg border border-border rounded text-text font-mono placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <!-- Dynamic field-value pairs -->
        <div
          v-for="(pair, index) in newEntryFields"
          :key="index"
          class="flex items-center gap-2"
        >
          <label class="text-xs text-text-muted w-12">Field:</label>
          <input
            v-model="pair.field"
            type="text"
            placeholder="field name"
            class="w-40 px-2 py-1 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <label class="text-xs text-text-muted">Value:</label>
          <input
            v-model="pair.value"
            type="text"
            placeholder="value"
            class="flex-1 px-2 py-1 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <button
            v-if="newEntryFields.length > 1"
            class="p-1 text-text-muted hover:text-danger rounded hover:bg-danger/10 transition-colors"
            @click="removeField(index)"
          >
            <Minus class="w-3.5 h-3.5" :stroke-width="1.5" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-accent-subtle rounded transition-colors"
            @click="addField"
          >
            <Plus class="w-3 h-3" :stroke-width="1.5" />
            Add Field
          </button>

          <div class="flex-1" />

          <button
            class="px-3 py-1 text-xs text-text-muted hover:text-text rounded hover:bg-overlay-0/50 transition-colors"
            @click="cancelAdd"
          >
            Cancel
          </button>
          <button
            class="px-3 py-1 text-xs font-medium rounded bg-accent-muted text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
            :disabled="!canAdd"
            @click="submitEntry"
          >
            Add Entry
          </button>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-overlay-0/20">
      <button
        class="px-2 py-0.5 text-xs text-text-muted hover:text-text hover:bg-overlay-0/50 rounded transition-colors"
        @click="loadNewest"
      >
        Newest
      </button>
      <button
        class="px-2 py-0.5 text-xs text-text-muted hover:text-text hover:bg-overlay-0/50 rounded transition-colors"
        @click="loadOldest"
      >
        Oldest
      </button>
      <div class="w-px h-4 bg-border" />
      <button
        class="px-2 py-0.5 text-xs text-text-muted hover:text-text hover:bg-overlay-0/50 rounded transition-colors"
        @click="loadPageBack"
      >
        &larr; Back
      </button>
      <button
        class="px-2 py-0.5 text-xs text-text-muted hover:text-text hover:bg-overlay-0/50 rounded transition-colors"
        @click="loadPageForward"
      >
        Forward &rarr;
      </button>
      <div class="flex-1" />
      <span class="text-xs text-text-muted tabular-nums">
        {{ streamStore.entries.length }} entries displayed
      </span>
    </div>

    <!-- Entries Table -->
    <div class="flex-1 overflow-auto scrollbar-thin">
      <!-- Empty state -->
      <div
        v-if="streamStore.entries.length === 0 && !streamStore.loading"
        class="flex flex-col items-center justify-center h-full text-text-muted"
      >
        <Activity class="w-10 h-10 mb-3 opacity-30" :stroke-width="1.5" />
        <span class="text-xs">No entries in this stream</span>
      </div>

      <!-- Loading -->
      <div
        v-else-if="streamStore.loading"
        class="flex items-center justify-center h-full"
      >
        <span class="text-xs text-text-muted">Loading entries...</span>
      </div>

      <!-- Entries -->
      <table v-else class="w-full text-xs">
        <thead class="sticky top-0 bg-surface-0 z-10">
          <tr class="border-b border-border">
            <th class="text-left px-4 py-2 font-medium text-text-muted w-12" />
            <th class="text-left px-4 py-2 font-medium text-text-muted">Entry ID</th>
            <th class="text-left px-4 py-2 font-medium text-text-muted">Fields</th>
            <th class="text-right px-4 py-2 font-medium text-text-muted w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="entry in streamStore.entries" :key="entry.id">
            <!-- Entry row -->
            <tr
              class="border-b border-border/50 hover:bg-overlay-0/20 cursor-pointer"
              @click="toggleExpand(entry.id)"
            >
              <td class="px-4 py-2">
                <ChevronRight
                  class="w-3 h-3 text-text-muted transition-transform duration-150"
                  :class="{ 'rotate-90': expandedEntryId === entry.id }"
                  :stroke-width="1.5"
                />
              </td>
              <td class="px-4 py-2 font-mono text-accent">
                {{ entry.id }}
              </td>
              <td class="px-4 py-2 text-text-muted">
                {{ fieldCount(entry) }} field{{ fieldCount(entry) !== 1 ? 's' : '' }}
                <span class="text-text-secondary ml-2 truncate">
                  {{ Object.entries(entry.fields).map(([k, v]) => `${k}=${v}`).join(', ').substring(0, 80) }}
                </span>
              </td>
              <td class="px-4 py-2 text-right">
                <button
                  class="p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                  title="Delete entry"
                  @click.stop="deleteEntry(entry)"
                >
                  <Trash2 class="w-3.5 h-3.5" :stroke-width="1.5" />
                </button>
              </td>
            </tr>

            <!-- Expanded entry detail -->
            <tr v-if="expandedEntryId === entry.id">
              <td colspan="4" class="bg-overlay-0/10 border-b border-border">
                <div class="p-2">
                  <StreamEntryViewer :entry="entry" />
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
