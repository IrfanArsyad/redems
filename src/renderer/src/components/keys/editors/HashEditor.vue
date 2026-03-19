<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, X, Plus, Trash2, Download } from 'lucide-vue-next'
import type { RedisHashField } from '@shared/types/redis.types'
import { useContentEditor } from '@renderer/composables/useContentEditor'
import { useNotification } from '@renderer/composables/useNotification'
import { exportAsCSV, exportAsJSON, saveExport } from '@renderer/utils/export'
import ContentEditor from './ContentEditor.vue'

const props = defineProps<{
  connectionId: string
  keyName: string
}>()

const fields = ref<RedisHashField[]>([])
const scanCursor = ref<string>('0')
const hasMore = ref(false)
const loading = ref(false)
const filterText = ref('')
const fieldCount = ref(0)

// New field inputs
const newField = ref('')
const newValue = ref('')

// Multi-select
const selectedFields = ref<Set<string>>(new Set())

// Content editor
const editor = useContentEditor()
const notify = useNotification()

async function loadFields(reset: boolean = true): Promise<void> {
  loading.value = true
  try {
    if (reset) {
      fields.value = []
      scanCursor.value = '0'
    }
    const pattern = filterText.value ? `*${filterText.value}*` : '*'
    const result = await window.api.invoke(
      'hash:hscan',
      props.connectionId,
      props.keyName,
      scanCursor.value,
      pattern,
      100
    )
    if (reset) {
      fields.value = result.fields
    } else {
      const existingSet = new Set(fields.value.map((f) => f.field))
      const newFields = result.fields.filter((f) => !existingSet.has(f.field))
      fields.value = [...fields.value, ...newFields]
    }
    scanCursor.value = result.cursor
    hasMore.value = result.cursor !== '0'
  } catch (err) {
    console.error('Failed to load hash fields:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadFields())

watch(() => props.keyName, () => loadFields())

const filteredFields = computed(() => {
  if (!filterText.value) return fields.value
  const lowerFilter = filterText.value.toLowerCase()
  return fields.value.filter(
    (f) =>
      f.field.toLowerCase().includes(lowerFilter) ||
      f.value.toLowerCase().includes(lowerFilter)
  )
})

async function addField(): Promise<void> {
  if (!newField.value.trim()) return
  try {
    await window.api.invoke('hash:hset', props.connectionId, props.keyName, newField.value, newValue.value)
    fields.value.unshift({ field: newField.value, value: newValue.value })
    newField.value = ''
    newValue.value = ''
    fieldCount.value++
    notify.success('Field added')
  } catch (err) {
    notify.error('Failed to add field', String(err))
  }
}

function openEditor(field: RedisHashField): void {
  if (editor.isOpen.value && editor.activeEntry.value?.id === field.field) {
    editor.close()
    return
  }
  editor.open({
    id: field.field,
    label: field.field,
    fields: [
      { key: 'field', label: 'Field Name', value: field.field, readonly: true },
      { key: 'value', label: 'Value', value: field.value, type: 'textarea' }
    ]
  })
}

async function onSave(): Promise<void> {
  if (!editor.activeEntry.value) return
  const fieldName = editor.activeEntry.value.id
  const newVal = editor.currentValues['value']
  try {
    await window.api.invoke('hash:hset', props.connectionId, props.keyName, fieldName, newVal)
    const idx = fields.value.findIndex((f) => f.field === fieldName)
    if (idx !== -1) {
      fields.value[idx] = { field: fieldName, value: newVal }
    }
    editor.afterSave()
    notify.success('Field updated')
  } catch (err) {
    notify.error('Failed to update field', String(err))
  }
}

async function deleteField(fieldName: string): Promise<void> {
  if (!confirm(`Delete field "${fieldName}"?`)) return
  try {
    await window.api.invoke('hash:hdel', props.connectionId, props.keyName, [fieldName])
    fields.value = fields.value.filter((f) => f.field !== fieldName)
    selectedFields.value.delete(fieldName)
    fieldCount.value--
    if (editor.activeEntry.value?.id === fieldName) editor.close()
    notify.success('Field deleted')
  } catch (err) {
    notify.error('Failed to delete field', String(err))
  }
}

async function deleteSelected(): Promise<void> {
  const fieldsToDelete = Array.from(selectedFields.value)
  if (fieldsToDelete.length === 0) return
  if (!confirm(`Delete ${fieldsToDelete.length} field(s)?`)) return
  try {
    await window.api.invoke('hash:hdel', props.connectionId, props.keyName, fieldsToDelete)
    const deleteSet = new Set(fieldsToDelete)
    fields.value = fields.value.filter((f) => !deleteSet.has(f.field))
    selectedFields.value.clear()
    fieldCount.value -= fieldsToDelete.length
    if (editor.activeEntry.value && deleteSet.has(editor.activeEntry.value.id)) editor.close()
    notify.success(`${fieldsToDelete.length} field(s) deleted`)
  } catch (err) {
    notify.error('Failed to delete fields', String(err))
  }
}

function toggleFieldSelection(fieldName: string): void {
  if (selectedFields.value.has(fieldName)) {
    selectedFields.value.delete(fieldName)
  } else {
    selectedFields.value.add(fieldName)
  }
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text)
}

function onFilter(): void {
  loadFields(true)
}

// Export
const showExportMenu = ref(false)

async function exportData(format: 'csv' | 'json'): Promise<void> {
  showExportMenu.value = false
  const data = filteredFields.value
  const name = `${props.keyName}-hash`
  try {
    let content: string
    if (format === 'csv') {
      content = exportAsCSV(
        ['Field', 'Value'],
        data.map((f) => [f.field, f.value])
      )
    } else {
      content = exportAsJSON(data.map((f) => ({ field: f.field, value: f.value })))
    }
    const path = await saveExport(content, name, format)
    if (path) notify.success(`Exported to ${path}`)
  } catch (err) {
    notify.error('Export failed', String(err))
  }
}
</script>

<template>
  <div class="flex flex-col h-full relative">
    <!-- Add field row + filter -->
    <div class="flex items-center gap-2 px-3 py-2 bg-surface-0 border-b border-border flex-shrink-0">
      <input
        v-model="newField"
        type="text"
        placeholder="Field name"
        class="input-sm !w-40"
        @keydown.enter="addField"
      />
      <input
        v-model="newValue"
        type="text"
        placeholder="Value"
        class="input-sm flex-1"
        @keydown.enter="addField"
      />
      <button
        class="btn-primary !h-8 !px-3 !text-xs"
        :disabled="!newField.trim()"
        @click="addField"
      >
        <Plus class="w-3.5 h-3.5" :stroke-width="2.5" />
        Add
      </button>

      <span class="divider-v" />

      <!-- Filter -->
      <div class="relative">
        <Search
          class="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-faint pointer-events-none"
        />
        <input
          v-model="filterText"
          type="text"
          placeholder="Filter..."
          class="input-sm !pl-7 !w-36"
          @keydown.enter="onFilter"
        />
      </div>

      <!-- Delete selected -->
      <button
        v-if="selectedFields.size > 0"
        class="btn-danger !h-8 !px-2.5 !text-xs"
        @click="deleteSelected"
      >
        <Trash2 class="w-3.5 h-3.5" :stroke-width="2" />
        {{ selectedFields.size }}
      </button>

      <!-- Export -->
      <div class="relative ml-auto">
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

      <!-- Field count -->
      <span class="text-xs text-text-faint tabular-nums font-medium">
        {{ filteredFields.length }} fields
      </span>
    </div>

    <!-- Table header -->
    <div class="flex items-center h-8 px-3 bg-mantle border-b border-border text-xs text-text-faint font-semibold uppercase tracking-wider flex-shrink-0">
      <div class="w-7 flex-shrink-0" />
      <div class="w-1/3 px-1">Field</div>
      <div class="flex-1 px-1">Value</div>
      <div class="w-8 flex-shrink-0" />
    </div>

    <!-- Content area: table + editor panel -->
    <div class="flex-1 min-h-0 relative flex">
      <!-- Fields list -->
      <div class="flex-1 overflow-auto scrollbar-thin">
        <div
          v-for="(field, idx) in filteredFields"
          :key="field.field"
          class="flex items-start min-h-[36px] px-3 border-b border-border-subtle text-xs group hover:bg-overlay-0/20 transition-colors duration-100 cursor-pointer"
          :class="{
            'bg-surface-0/30': idx % 2 === 1 && editor.activeEntry.value?.id !== field.field,
            'border-l-2 border-l-accent bg-accent-subtle': editor.activeEntry.value?.id === field.field,
            'border-l-2 border-l-transparent': editor.activeEntry.value?.id !== field.field
          }"
          @click="openEditor(field)"
        >
          <!-- Checkbox -->
          <div class="w-7 flex-shrink-0 flex items-center justify-center pt-2.5">
            <input
              type="checkbox"
              :checked="selectedFields.has(field.field)"
              class="w-3.5 h-3.5 rounded border-border bg-input-bg accent-accent cursor-pointer"
              @change="toggleFieldSelection(field.field)"
              @click.stop
            />
          </div>

          <!-- Field name -->
          <div
            class="w-1/3 px-1 py-2.5 font-mono text-accent truncate"
            :title="field.field"
          >
            {{ field.field }}
          </div>

          <!-- Value -->
          <div class="flex-1 px-1 py-2.5 min-w-0">
            <span
              class="font-mono text-text-secondary break-all line-clamp-2"
              :title="field.value"
            >
              {{ field.value }}
            </span>
          </div>

          <!-- Delete button -->
          <div class="w-8 flex-shrink-0 flex items-center justify-center pt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class="btn-icon-sm !w-5 !h-5 hover:!bg-danger-muted hover:!text-danger"
              title="Delete Field"
              @click.stop="deleteField(field.field)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- Load more -->
        <div
          v-if="hasMore"
          class="flex items-center justify-center py-3"
        >
          <button
            class="text-xs text-accent hover:text-accent-hover transition-colors px-4 py-1.5 rounded-md hover:bg-accent-subtle font-medium"
            :disabled="loading"
            @click="loadFields(false)"
          >
            {{ loading ? 'Loading...' : 'Load More' }}
          </button>
        </div>

        <!-- Empty state -->
        <div
          v-if="!loading && filteredFields.length === 0"
          class="flex items-center justify-center py-10 text-text-faint text-xs"
        >
          No fields found
        </div>
      </div>

      <!-- Side panel editor -->
      <ContentEditor
        :is-open="editor.isOpen.value"
        :is-pinned="editor.isPinned.value"
        :active-entry="editor.activeEntry.value"
        :current-values="editor.currentValues"
        :is-dirty="editor.isDirty.value"
        @close="editor.close()"
        @save="onSave"
        @toggle-pin="editor.togglePin()"
        @update-field="editor.updateField"
      />
    </div>
  </div>
</template>
