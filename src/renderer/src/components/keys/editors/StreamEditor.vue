<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { X, Download } from 'lucide-vue-next'
import type { RedisStreamEntry, RedisStreamInfo } from '@shared/types/redis.types'
import { useContentEditor } from '@renderer/composables/useContentEditor'
import { useNotification } from '@renderer/composables/useNotification'
import { exportAsCSV, exportAsJSON, saveExport } from '@renderer/utils/export'
import ContentEditor from './ContentEditor.vue'

const props = defineProps<{
  connectionId: string
  keyName: string
}>()

const entries = ref<RedisStreamEntry[]>([])
const streamInfo = ref<RedisStreamInfo | null>(null)
const loading = ref(false)
const pageSize = 50

// Direction for navigation
type Direction = 'newest' | 'oldest'
const direction = ref<Direction>('newest')

// Add entry form
const showAddForm = ref(false)
const newEntryId = ref('*')
const newEntryFields = ref<Array<{ key: string; value: string }>>([{ key: '', value: '' }])

// Content editor (readonly for streams)
const editor = useContentEditor()
const notify = useNotification()

async function loadEntries(): Promise<void> {
  loading.value = true
  try {
    // Load stream info
    streamInfo.value = await window.api.invoke('stream:xinfo', props.connectionId, props.keyName)

    // Load entries
    if (direction.value === 'newest') {
      entries.value = await window.api.invoke(
        'stream:xrevrange',
        props.connectionId,
        props.keyName,
        '+',
        '-',
        pageSize
      )
    } else {
      entries.value = await window.api.invoke(
        'stream:xrange',
        props.connectionId,
        props.keyName,
        '-',
        '+',
        pageSize
      )
    }
  } catch (err) {
    console.error('Failed to load stream entries:', err)
  } finally {
    loading.value = false
  }
}

async function loadOlderEntries(): Promise<void> {
  if (entries.value.length === 0) return
  loading.value = true
  try {
    const lastId = entries.value[entries.value.length - 1].id
    const moreEntries = await window.api.invoke(
      'stream:xrevrange',
      props.connectionId,
      props.keyName,
      lastId,
      '-',
      pageSize + 1
    )
    // Skip the first entry since it matches our last one
    const newEntries = moreEntries.slice(1)
    if (newEntries.length > 0) {
      entries.value = [...entries.value, ...newEntries]
    }
  } catch (err) {
    console.error('Failed to load more entries:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadEntries())
watch(() => props.keyName, () => loadEntries())

function toggleDirection(dir: Direction): void {
  direction.value = dir
  loadEntries()
}

function openEntry(entry: RedisStreamEntry): void {
  if (editor.isOpen.value && editor.activeEntry.value?.id === entry.id) {
    editor.close()
    return
  }
  // Build readonly fields from stream entry
  const fieldList = Object.entries(entry.fields).map(([key, value]) => ({
    key,
    label: key,
    value: String(value),
    readonly: true as const
  }))
  editor.open({
    id: entry.id,
    label: entry.id,
    fields: [
      { key: '_id', label: 'Entry ID', value: entry.id, readonly: true },
      ...fieldList
    ]
  })
}

function addFieldRow(): void {
  newEntryFields.value.push({ key: '', value: '' })
}

function removeFieldRow(idx: number): void {
  if (newEntryFields.value.length > 1) {
    newEntryFields.value.splice(idx, 1)
  }
}

async function addEntry(): Promise<void> {
  const fields: Record<string, string> = {}
  for (const f of newEntryFields.value) {
    if (f.key.trim()) {
      fields[f.key.trim()] = f.value
    }
  }
  if (Object.keys(fields).length === 0) return

  try {
    await window.api.invoke(
      'stream:xadd',
      props.connectionId,
      props.keyName,
      newEntryId.value || '*',
      fields
    )
    // Reset form
    newEntryId.value = '*'
    newEntryFields.value = [{ key: '', value: '' }]
    showAddForm.value = false
    await loadEntries()
    notify.success('Entry added')
  } catch (err) {
    notify.error('Failed to add entry', String(err))
  }
}

// Export
const showExportMenu = ref(false)

async function exportData(format: 'csv' | 'json'): Promise<void> {
  showExportMenu.value = false
  const data = entries.value
  const name = `${props.keyName}-stream`
  try {
    let content: string
    if (format === 'csv') {
      // Collect all unique field keys across entries
      const fieldKeys = new Set<string>()
      for (const entry of data) {
        for (const key of Object.keys(entry.fields)) {
          fieldKeys.add(key)
        }
      }
      const sortedKeys = [...fieldKeys].sort()
      content = exportAsCSV(
        ['ID', ...sortedKeys],
        data.map((e) => [e.id, ...sortedKeys.map((k) => e.fields[k] ?? '')])
      )
    } else {
      content = exportAsJSON(data.map((e) => ({ id: e.id, ...e.fields })))
    }
    const path = await saveExport(content, name, format)
    if (path) notify.success(`Exported to ${path}`)
  } catch (err) {
    notify.error('Export failed', String(err))
  }
}

async function deleteEntry(id: string): Promise<void> {
  if (!confirm(`Delete stream entry "${id}"?`)) return
  try {
    await window.api.invoke('stream:xdel', props.connectionId, props.keyName, [id])
    entries.value = entries.value.filter((e) => e.id !== id)
    if (editor.activeEntry.value?.id === id) editor.close()
    notify.success('Entry deleted')
  } catch (err) {
    notify.error('Failed to delete entry', String(err))
  }
}
</script>

<template>
  <div class="flex flex-col h-full relative">
    <!-- Stream info + toolbar -->
    <div class="flex items-center gap-2 px-3 py-2 bg-surface-0 border-b border-border flex-shrink-0">
      <!-- Direction toggle -->
      <div class="flex items-center rounded border border-border overflow-hidden">
        <button
          class="h-6 px-2 text-xs transition-colors"
          :class="{
            'bg-accent-muted text-accent': direction === 'newest',
            'text-text-muted hover:text-text': direction !== 'newest'
          }"
          @click="toggleDirection('newest')"
        >
          Newest First
        </button>
        <button
          class="h-6 px-2 text-xs border-l border-border transition-colors"
          :class="{
            'bg-accent-muted text-accent': direction === 'oldest',
            'text-text-muted hover:text-text': direction !== 'oldest'
          }"
          @click="toggleDirection('oldest')"
        >
          Oldest First
        </button>
      </div>

      <!-- Add entry button -->
      <button
        class="h-7 px-3 text-xs rounded-md font-medium bg-accent-muted text-accent hover:bg-accent/20 transition-colors"
        @click="showAddForm = !showAddForm"
      >
        {{ showAddForm ? 'Cancel' : 'Add Entry' }}
      </button>

      <div class="flex-1" />

      <!-- Export -->
      <div class="relative">
        <button
          class="btn-icon-sm"
          title="Export data"
          @click.stop="showExportMenu = !showExportMenu"
        >
          <Download class="w-3.5 h-3.5" />
        </button>
        <div
          v-if="showExportMenu"
          class="absolute right-0 top-full mt-1 bg-surface-0 border border-border rounded-md shadow-lg z-50 py-1 min-w-[120px]"
        >
          <button
            class="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay-0 transition-colors"
            @click="exportData('csv')"
          >
            Export CSV
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay-0 transition-colors"
            @click="exportData('json')"
          >
            Export JSON
          </button>
        </div>
      </div>

      <!-- Stream info -->
      <div class="flex items-center gap-3 text-xs text-text-muted">
        <span v-if="streamInfo">Length: {{ streamInfo.length }}</span>
        <span v-if="streamInfo">Groups: {{ streamInfo.groups }}</span>
        <span>{{ entries.length }} loaded</span>
      </div>
    </div>

    <!-- Add entry form -->
    <div
      v-if="showAddForm"
      class="px-3 py-3 bg-surface-0/80 border-b border-border flex-shrink-0"
    >
      <div class="flex items-center gap-2 mb-2">
        <label class="text-xs text-text-muted w-12">ID:</label>
        <input
          v-model="newEntryId"
          type="text"
          placeholder="* (auto-generate)"
          class="input-sm w-48 font-mono"
        />
      </div>

      <div
        v-for="(field, idx) in newEntryFields"
        :key="idx"
        class="flex items-center gap-2 mb-1.5"
      >
        <label class="text-xs text-text-muted w-12">Field:</label>
        <input
          v-model="field.key"
          type="text"
          placeholder="Field name"
          class="input-sm w-40"
        />
        <input
          v-model="field.value"
          type="text"
          placeholder="Value"
          class="input-sm flex-1"
        />
        <button
          v-if="newEntryFields.length > 1"
          class="btn-icon-sm !w-6 !h-6 hover:!bg-danger/20 hover:!text-danger"
          @click="removeFieldRow(idx)"
        >
          <X class="w-3 h-3" />
        </button>
      </div>

      <div class="flex items-center gap-2 mt-2">
        <button
          class="h-6 px-2 text-xs rounded-md text-accent hover:bg-accent-subtle transition-colors"
          @click="addFieldRow"
        >
          + Add Field
        </button>
        <div class="flex-1" />
        <button
          class="h-7 px-4 text-xs rounded-md font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
          @click="addEntry"
        >
          Add Entry
        </button>
      </div>
    </div>

    <!-- Table header -->
    <div class="flex items-center h-7 px-3 bg-surface-0/50 border-b border-border text-xs text-text-muted font-medium flex-shrink-0">
      <div class="w-48 flex-shrink-0 px-1">ID</div>
      <div class="flex-1 px-1">Fields</div>
      <div class="w-8 flex-shrink-0" />
    </div>

    <!-- Content area: table + editor panel -->
    <div class="flex-1 min-h-0 relative flex">
      <!-- Entries list -->
      <div class="flex-1 overflow-auto scrollbar-thin">
        <div
          v-for="(entry, idx) in entries"
          :key="entry.id"
          class="flex items-center min-h-[32px] px-3 border-b border-border/50 text-xs group hover:bg-overlay-0/50 transition-colors cursor-pointer"
          :class="{
            'bg-surface-0/30': idx % 2 === 1 && editor.activeEntry.value?.id !== entry.id,
            'border-l-2 border-l-accent bg-accent-subtle': editor.activeEntry.value?.id === entry.id,
            'border-l-2 border-l-transparent': editor.activeEntry.value?.id !== entry.id
          }"
          @click="openEntry(entry)"
        >
          <!-- Entry ID -->
          <div class="w-48 flex-shrink-0 px-1 font-mono text-accent">
            {{ entry.id }}
          </div>

          <!-- Field preview -->
          <div class="flex-1 px-1 truncate text-text-muted">
            {{ Object.keys(entry.fields).length }} fields:
            {{ Object.entries(entry.fields).map(([k, v]) => `${k}=${v}`).join(', ') }}
          </div>

          <!-- Delete -->
          <div class="w-8 flex-shrink-0 flex items-center justify-center">
            <button
              class="btn-icon-sm !w-5 !h-5 hover:!bg-danger/20 hover:!text-danger opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete Entry"
              @click.stop="deleteEntry(entry.id)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- Load more -->
        <div
          v-if="entries.length >= pageSize"
          class="flex items-center justify-center py-3"
        >
          <button
            class="text-xs text-accent hover:text-accent-hover transition-colors px-4 py-1.5 rounded-md hover:bg-accent-subtle"
            :disabled="loading"
            @click="loadOlderEntries"
          >
            {{ loading ? 'Loading...' : 'Load More' }}
          </button>
        </div>

        <!-- Empty state -->
        <div
          v-if="!loading && entries.length === 0"
          class="flex items-center justify-center py-8 text-text-muted text-xs"
        >
          Stream is empty
        </div>
      </div>

      <!-- Side panel editor (readonly for streams) -->
      <ContentEditor
        :is-open="editor.isOpen.value"
        :is-pinned="editor.isPinned.value"
        :active-entry="editor.activeEntry.value"
        :current-values="editor.currentValues"
        :is-dirty="editor.isDirty.value"
        :readonly="true"
        @close="editor.close()"
        @save="() => {}"
        @toggle-pin="editor.togglePin()"
        @update-field="editor.updateField"
      />
    </div>
  </div>
</template>
