<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, X, Download } from 'lucide-vue-next'
import { useContentEditor } from '@renderer/composables/useContentEditor'
import { useNotification } from '@renderer/composables/useNotification'
import { exportAsCSV, exportAsJSON, saveExport } from '@renderer/utils/export'
import ContentEditor from './ContentEditor.vue'

const props = defineProps<{
  connectionId: string
  keyName: string
}>()

const members = ref<string[]>([])
const scanCursor = ref<string>('0')
const hasMore = ref(false)
const loading = ref(false)
const memberCount = ref(0)
const filterText = ref('')
const newMember = ref('')

// Content editor
const editor = useContentEditor()
const notify = useNotification()

async function loadMembers(reset: boolean = true): Promise<void> {
  loading.value = true
  try {
    if (reset) {
      members.value = []
      scanCursor.value = '0'
    }
    memberCount.value = await window.api.invoke('set:scard', props.connectionId, props.keyName)
    const pattern = filterText.value ? `*${filterText.value}*` : '*'
    const result = await window.api.invoke(
      'set:sscan',
      props.connectionId,
      props.keyName,
      scanCursor.value,
      pattern,
      100
    )
    if (reset) {
      members.value = result.members
    } else {
      const existingSet = new Set(members.value)
      const newMembers = result.members.filter((m: string) => !existingSet.has(m))
      members.value = [...members.value, ...newMembers]
    }
    scanCursor.value = result.cursor
    hasMore.value = result.cursor !== '0'
  } catch (err) {
    console.error('Failed to load set members:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadMembers())
watch(() => props.keyName, () => loadMembers())

const filteredMembers = computed(() => {
  if (!filterText.value) return members.value
  const lowerFilter = filterText.value.toLowerCase()
  return members.value.filter((m) => m.toLowerCase().includes(lowerFilter))
})

async function addMember(): Promise<void> {
  if (!newMember.value.trim()) return
  try {
    await window.api.invoke('set:sadd', props.connectionId, props.keyName, [newMember.value])
    members.value.unshift(newMember.value)
    memberCount.value++
    newMember.value = ''
    notify.success('Member added')
  } catch (err) {
    notify.error('Failed to add member', String(err))
  }
}

function openEditor(member: string): void {
  if (editor.isOpen.value && editor.activeEntry.value?.id === member) {
    editor.close()
    return
  }
  editor.open({
    id: member,
    label: member.length > 30 ? member.slice(0, 30) + '...' : member,
    fields: [
      { key: 'value', label: 'Member Value', value: member, type: 'textarea' }
    ]
  })
}

async function onSave(): Promise<void> {
  if (!editor.activeEntry.value) return
  const oldMember = editor.activeEntry.value.id
  const newVal = editor.currentValues['value']
  if (oldMember === newVal) {
    editor.afterSave()
    return
  }
  try {
    // Replace: remove old, add new
    await window.api.invoke('set:srem', props.connectionId, props.keyName, [oldMember])
    await window.api.invoke('set:sadd', props.connectionId, props.keyName, [newVal])
    const idx = members.value.indexOf(oldMember)
    if (idx !== -1) {
      members.value[idx] = newVal
    }
    editor.afterSave()
    notify.success('Member updated')
  } catch (err) {
    notify.error('Failed to update member', String(err))
  }
}

async function removeMember(member: string): Promise<void> {
  if (!confirm(`Remove member "${member.length > 50 ? member.slice(0, 50) + '...' : member}"?`)) return
  try {
    await window.api.invoke('set:srem', props.connectionId, props.keyName, [member])
    members.value = members.value.filter((m) => m !== member)
    memberCount.value--
    if (editor.activeEntry.value?.id === member) editor.close()
    notify.success('Member removed')
  } catch (err) {
    notify.error('Failed to remove member', String(err))
  }
}

function onFilter(): void {
  loadMembers(true)
}

// Export
const showExportMenu = ref(false)

async function exportData(format: 'csv' | 'json'): Promise<void> {
  showExportMenu.value = false
  const data = filteredMembers.value
  const name = `${props.keyName}-set`
  try {
    let content: string
    if (format === 'csv') {
      content = exportAsCSV(['Member'], data.map((m) => [m]))
    } else {
      content = exportAsJSON(data.map((m) => ({ member: m })))
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
    <!-- Toolbar: add member + filter -->
    <div class="flex items-center gap-2 px-3 py-2 bg-surface-0 border-b border-border flex-shrink-0">
      <input
        v-model="newMember"
        type="text"
        placeholder="Add member..."
        class="input-sm flex-1"
        @keydown.enter="addMember"
      />
      <button
        class="h-7 px-3 text-xs rounded-md font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        :disabled="!newMember.trim()"
        @click="addMember"
      >
        Add
      </button>

      <div class="divider-v" />

      <!-- Filter -->
      <div class="relative">
        <Search
          class="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none"
        />
        <input
          v-model="filterText"
          type="text"
          placeholder="Filter..."
          class="input-sm !pl-7 !w-36"
          @keydown.enter="onFilter"
        />
      </div>

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

      <span class="text-xs text-text-muted">{{ memberCount }} members</span>
    </div>

    <!-- Content area: list + editor panel -->
    <div class="flex-1 min-h-0 relative flex">
      <!-- Members list -->
      <div class="flex-1 overflow-auto scrollbar-thin">
        <div
          v-for="(member, idx) in filteredMembers"
          :key="member"
          class="flex items-center min-h-[32px] px-3 border-b border-border/50 text-xs group hover:bg-overlay-0/50 transition-colors cursor-pointer"
          :class="{
            'bg-surface-0/30': idx % 2 === 1 && editor.activeEntry.value?.id !== member,
            'border-l-2 border-l-accent bg-accent-subtle': editor.activeEntry.value?.id === member,
            'border-l-2 border-l-transparent': editor.activeEntry.value?.id !== member
          }"
          @click="openEditor(member)"
        >
          <!-- Member value -->
          <div
            class="flex-1 min-w-0 truncate font-mono text-text py-2"
            :title="member"
          >
            {{ member }}
          </div>

          <!-- Remove button -->
          <button
            class="btn-icon-sm !w-5 !h-5 hover:!bg-danger/20 hover:!text-danger opacity-0 group-hover:opacity-100"
            title="Remove Member"
            @click.stop="removeMember(member)"
          >
            <X class="w-3 h-3" />
          </button>
        </div>

        <!-- Load more -->
        <div
          v-if="hasMore"
          class="flex items-center justify-center py-3"
        >
          <button
            class="text-xs text-accent hover:text-accent-hover transition-colors px-4 py-1.5 rounded-md hover:bg-accent-subtle"
            :disabled="loading"
            @click="loadMembers(false)"
          >
            {{ loading ? 'Loading...' : 'Load More' }}
          </button>
        </div>

        <!-- Empty state -->
        <div
          v-if="!loading && filteredMembers.length === 0"
          class="flex items-center justify-center py-8 text-text-muted text-xs"
        >
          Set is empty
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
