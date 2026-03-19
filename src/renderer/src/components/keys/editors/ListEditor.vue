<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { X, Download } from 'lucide-vue-next'
import type { RedisListItem } from '@shared/types/redis.types'
import { useContentEditor } from '@renderer/composables/useContentEditor'
import { useNotification } from '@renderer/composables/useNotification'
import { exportAsCSV, exportAsJSON, saveExport } from '@renderer/utils/export'
import ContentEditor from './ContentEditor.vue'

const props = defineProps<{
  connectionId: string
  keyName: string
}>()

const items = ref<RedisListItem[]>([])
const totalLength = ref(0)
const loading = ref(false)
const pageSize = 50
const currentPage = ref(0)

// Push/Pop inputs
const pushValue = ref('')

// Content editor
const editor = useContentEditor()
const notify = useNotification()

const totalPages = computed(() => Math.max(1, Math.ceil(totalLength.value / pageSize)))
const pageStart = computed(() => currentPage.value * pageSize)
const pageEnd = computed(() => Math.min(pageStart.value + pageSize - 1, totalLength.value - 1))

async function loadItems(): Promise<void> {
  loading.value = true
  try {
    totalLength.value = await window.api.invoke('list:llen', props.connectionId, props.keyName)
    if (totalLength.value === 0) {
      items.value = []
      return
    }
    items.value = await window.api.invoke(
      'list:lrange',
      props.connectionId,
      props.keyName,
      pageStart.value,
      pageEnd.value
    )
  } catch (err) {
    console.error('Failed to load list items:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadItems())
watch(() => props.keyName, () => {
  currentPage.value = 0
  loadItems()
})

function goToPage(page: number): void {
  if (page < 0 || page >= totalPages.value) return
  currentPage.value = page
  loadItems()
}

async function onLpush(): Promise<void> {
  if (!pushValue.value.trim()) return
  try {
    await window.api.invoke('list:lpush', props.connectionId, props.keyName, [pushValue.value])
    pushValue.value = ''
    currentPage.value = 0
    await loadItems()
    notify.success('LPUSH successful')
  } catch (err) {
    notify.error('LPUSH failed', String(err))
  }
}

async function onRpush(): Promise<void> {
  if (!pushValue.value.trim()) return
  try {
    await window.api.invoke('list:rpush', props.connectionId, props.keyName, [pushValue.value])
    pushValue.value = ''
    await loadItems()
    notify.success('RPUSH successful')
  } catch (err) {
    notify.error('RPUSH failed', String(err))
  }
}

async function onLpop(): Promise<void> {
  try {
    await window.api.invoke('list:lpop', props.connectionId, props.keyName)
    await loadItems()
    notify.success('LPOP successful')
  } catch (err) {
    notify.error('LPOP failed', String(err))
  }
}

async function onRpop(): Promise<void> {
  try {
    await window.api.invoke('list:rpop', props.connectionId, props.keyName)
    await loadItems()
    notify.success('RPOP successful')
  } catch (err) {
    notify.error('RPOP failed', String(err))
  }
}

function openEditor(item: RedisListItem): void {
  if (editor.isOpen.value && editor.activeEntry.value?.id === String(item.index)) {
    editor.close()
    return
  }
  editor.open({
    id: String(item.index),
    label: `Index ${item.index}`,
    fields: [
      { key: 'index', label: 'Index', value: String(item.index), readonly: true },
      { key: 'value', label: 'Value', value: item.value, type: 'textarea' }
    ]
  })
}

async function onSave(): Promise<void> {
  if (!editor.activeEntry.value) return
  const index = parseInt(editor.activeEntry.value.id)
  const newVal = editor.currentValues['value']
  try {
    await window.api.invoke('list:lset', props.connectionId, props.keyName, index, newVal)
    const idx = items.value.findIndex((i) => i.index === index)
    if (idx !== -1) {
      items.value[idx] = { index, value: newVal }
    }
    editor.afterSave()
    notify.success('Item updated')
  } catch (err) {
    notify.error('Failed to update item', String(err))
  }
}

// Export
const showExportMenu = ref(false)

async function exportData(format: 'csv' | 'json'): Promise<void> {
  showExportMenu.value = false
  const data = items.value
  const name = `${props.keyName}-list`
  try {
    let content: string
    if (format === 'csv') {
      content = exportAsCSV(
        ['Index', 'Value'],
        data.map((i) => [String(i.index), i.value])
      )
    } else {
      content = exportAsJSON(data.map((i) => ({ index: i.index, value: i.value })))
    }
    const path = await saveExport(content, name, format)
    if (path) notify.success(`Exported to ${path}`)
  } catch (err) {
    notify.error('Export failed', String(err))
  }
}

async function deleteItem(item: RedisListItem): Promise<void> {
  if (!confirm(`Delete item at index ${item.index}?`)) return
  try {
    await window.api.invoke('list:lrem', props.connectionId, props.keyName, 1, item.value)
    if (editor.activeEntry.value?.id === String(item.index)) editor.close()
    await loadItems()
    notify.success('Item deleted')
  } catch (err) {
    notify.error('Failed to delete item', String(err))
  }
}
</script>

<template>
  <div class="flex flex-col h-full relative">
    <!-- Push/Pop toolbar -->
    <div class="flex items-center gap-2 px-3 py-2 bg-surface-0 border-b border-border flex-shrink-0">
      <input
        v-model="pushValue"
        type="text"
        placeholder="Value to push..."
        class="input-sm flex-1"
        @keydown.enter="onLpush"
      />
      <button
        class="h-7 px-3 text-xs rounded-md font-medium bg-accent-muted text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
        :disabled="!pushValue.trim()"
        @click="onLpush"
      >
        LPUSH
      </button>
      <button
        class="h-7 px-3 text-xs rounded-md font-medium bg-accent-muted text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
        :disabled="!pushValue.trim()"
        @click="onRpush"
      >
        RPUSH
      </button>

      <div class="divider-v" />

      <button
        class="h-7 px-3 text-xs rounded-md font-medium bg-warning-muted text-warning hover:bg-warning/25 transition-colors disabled:opacity-50"
        :disabled="totalLength === 0"
        @click="onLpop"
      >
        LPOP
      </button>
      <button
        class="h-7 px-3 text-xs rounded-md font-medium bg-warning-muted text-warning hover:bg-warning/25 transition-colors disabled:opacity-50"
        :disabled="totalLength === 0"
        @click="onRpop"
      >
        RPOP
      </button>

      <div class="divider-v" />

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

      <span class="text-xs text-text-muted">{{ totalLength }} items</span>
    </div>

    <!-- Table header -->
    <div class="flex items-center h-7 px-3 bg-surface-0/50 border-b border-border text-xs text-text-muted font-medium flex-shrink-0">
      <div class="w-16 flex-shrink-0 px-1">Index</div>
      <div class="flex-1 px-1">Value</div>
      <div class="w-8 flex-shrink-0" />
    </div>

    <!-- Content area: table + editor panel -->
    <div class="flex-1 min-h-0 relative flex">
      <!-- Items list -->
      <div class="flex-1 overflow-auto scrollbar-thin">
        <div
          v-for="(item, idx) in items"
          :key="item.index"
          class="flex items-start min-h-[32px] px-3 border-b border-border/50 text-xs group hover:bg-overlay-0/50 transition-colors cursor-pointer"
          :class="{
            'bg-surface-0/30': idx % 2 === 1 && editor.activeEntry.value?.id !== String(item.index),
            'border-l-2 border-l-accent bg-accent-subtle': editor.activeEntry.value?.id === String(item.index),
            'border-l-2 border-l-transparent': editor.activeEntry.value?.id !== String(item.index)
          }"
          @click="openEditor(item)"
        >
          <!-- Index -->
          <div class="w-16 flex-shrink-0 px-1 py-2 text-text-muted font-mono">
            {{ item.index }}
          </div>

          <!-- Value -->
          <div class="flex-1 px-1 py-2 min-w-0">
            <span class="font-mono text-text break-all line-clamp-2">
              {{ item.value }}
            </span>
          </div>

          <!-- Delete -->
          <div class="w-8 flex-shrink-0 flex items-center justify-center pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class="btn-icon-sm !w-5 !h-5 hover:!bg-danger/20 hover:!text-danger"
              title="Delete Item"
              @click.stop="deleteItem(item)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="!loading && items.length === 0"
          class="flex items-center justify-center py-8 text-text-muted text-xs"
        >
          List is empty
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

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="flex items-center justify-center gap-2 px-3 py-2 bg-surface-0 border-t border-border flex-shrink-0"
    >
      <button
        class="h-6 px-2.5 text-xs rounded-md hover:bg-overlay-0 transition-colors text-text-muted hover:text-text disabled:opacity-30"
        :disabled="currentPage === 0"
        @click="goToPage(currentPage - 1)"
      >
        Prev
      </button>
      <span class="text-xs text-text-muted">
        Page {{ currentPage + 1 }} of {{ totalPages }}
        ({{ pageStart }}-{{ pageEnd }})
      </span>
      <button
        class="h-6 px-2.5 text-xs rounded-md hover:bg-overlay-0 transition-colors text-text-muted hover:text-text disabled:opacity-30"
        :disabled="currentPage >= totalPages - 1"
        @click="goToPage(currentPage + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>
