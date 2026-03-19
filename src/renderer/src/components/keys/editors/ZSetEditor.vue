<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { X, ArrowUp, ArrowDown, Download } from 'lucide-vue-next'
import type { RedisZSetMember } from '@shared/types/redis.types'
import { useContentEditor } from '@renderer/composables/useContentEditor'
import { useNotification } from '@renderer/composables/useNotification'
import { exportAsCSV, exportAsJSON, saveExport } from '@renderer/utils/export'
import ContentEditor from './ContentEditor.vue'

const props = defineProps<{
  connectionId: string
  keyName: string
}>()

const members = ref<RedisZSetMember[]>([])
const scanCursor = ref<string>('0')
const hasMore = ref(false)
const loading = ref(false)
const memberCount = ref(0)

// Sort
type SortField = 'score' | 'member'
type SortDir = 'asc' | 'desc'
const sortField = ref<SortField>('score')
const sortDir = ref<SortDir>('asc')

// New member inputs
const newMember = ref('')
const newScore = ref<string>('0')

// Score range filter
const minScore = ref<string>('')
const maxScore = ref<string>('')

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
    memberCount.value = await window.api.invoke('zset:zcard', props.connectionId, props.keyName)
    const result = await window.api.invoke(
      'zset:zscan',
      props.connectionId,
      props.keyName,
      scanCursor.value,
      '*',
      100
    )
    if (reset) {
      members.value = result.members
    } else {
      const existingSet = new Set(members.value.map((m) => m.value))
      const newMembers = result.members.filter((m: RedisZSetMember) => !existingSet.has(m.value))
      members.value = [...members.value, ...newMembers]
    }
    scanCursor.value = result.cursor
    hasMore.value = result.cursor !== '0'
  } catch (err) {
    console.error('Failed to load sorted set members:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadMembers())
watch(() => props.keyName, () => loadMembers())

const sortedMembers = computed(() => {
  let list = [...members.value]

  // Filter by score range
  const min = minScore.value ? parseFloat(minScore.value) : -Infinity
  const max = maxScore.value ? parseFloat(maxScore.value) : Infinity
  if (min !== -Infinity || max !== Infinity) {
    list = list.filter((m) => m.score >= min && m.score <= max)
  }

  // Sort
  list.sort((a, b) => {
    let cmp = 0
    if (sortField.value === 'score') {
      cmp = a.score - b.score
    } else {
      cmp = a.value.localeCompare(b.value)
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })

  return list
})

function toggleSort(field: SortField): void {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

function isSortedBy(field: SortField): boolean {
  return sortField.value === field
}

async function addMember(): Promise<void> {
  if (!newMember.value.trim()) return
  const score = parseFloat(newScore.value) || 0
  try {
    await window.api.invoke('zset:zadd', props.connectionId, props.keyName, [
      { score, value: newMember.value }
    ])
    members.value.push({ value: newMember.value, score })
    memberCount.value++
    newMember.value = ''
    newScore.value = '0'
    notify.success('Member added')
  } catch (err) {
    notify.error('Failed to add member', String(err))
  }
}

function openEditor(member: RedisZSetMember): void {
  if (editor.isOpen.value && editor.activeEntry.value?.id === member.value) {
    editor.close()
    return
  }
  editor.open({
    id: member.value,
    label: member.value.length > 30 ? member.value.slice(0, 30) + '...' : member.value,
    fields: [
      { key: 'member', label: 'Member', value: member.value, readonly: true },
      { key: 'score', label: 'Score', value: String(member.score), type: 'number' }
    ]
  })
}

async function onSave(): Promise<void> {
  if (!editor.activeEntry.value) return
  const memberVal = editor.activeEntry.value.id
  const newScoreVal = parseFloat(editor.currentValues['score'])
  if (isNaN(newScoreVal)) return

  try {
    await window.api.invoke('zset:zadd', props.connectionId, props.keyName, [
      { score: newScoreVal, value: memberVal }
    ])
    const idx = members.value.findIndex((m) => m.value === memberVal)
    if (idx !== -1) {
      members.value[idx] = { value: memberVal, score: newScoreVal }
    }
    editor.afterSave()
    notify.success('Score updated')
  } catch (err) {
    notify.error('Failed to update score', String(err))
  }
}

// Export
const showExportMenu = ref(false)

async function exportData(format: 'csv' | 'json'): Promise<void> {
  showExportMenu.value = false
  const data = sortedMembers.value
  const name = `${props.keyName}-zset`
  try {
    let content: string
    if (format === 'csv') {
      content = exportAsCSV(
        ['Member', 'Score'],
        data.map((m) => [m.value, String(m.score)])
      )
    } else {
      content = exportAsJSON(data.map((m) => ({ member: m.value, score: m.score })))
    }
    const path = await saveExport(content, name, format)
    if (path) notify.success(`Exported to ${path}`)
  } catch (err) {
    notify.error('Export failed', String(err))
  }
}

async function removeMember(member: string): Promise<void> {
  if (!confirm(`Remove member "${member.length > 50 ? member.slice(0, 50) + '...' : member}"?`)) return
  try {
    await window.api.invoke('zset:zrem', props.connectionId, props.keyName, [member])
    members.value = members.value.filter((m) => m.value !== member)
    memberCount.value--
    if (editor.activeEntry.value?.id === member) editor.close()
    notify.success('Member removed')
  } catch (err) {
    notify.error('Failed to remove member', String(err))
  }
}
</script>

<template>
  <div class="flex flex-col h-full relative">
    <!-- Toolbar: add member -->
    <div class="flex items-center gap-2 px-3 py-2 bg-surface-0 border-b border-border flex-shrink-0">
      <input
        v-model="newMember"
        type="text"
        placeholder="Member"
        class="input-sm flex-1"
        @keydown.enter="addMember"
      />
      <input
        v-model="newScore"
        type="number"
        placeholder="Score"
        step="any"
        class="input-sm w-24"
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

      <!-- Score range filter -->
      <span class="text-xs text-text-muted">Score:</span>
      <input
        v-model="minScore"
        type="number"
        placeholder="Min"
        step="any"
        class="input-sm w-20"
      />
      <span class="text-xs text-text-muted">-</span>
      <input
        v-model="maxScore"
        type="number"
        placeholder="Max"
        step="any"
        class="input-sm w-20"
      />

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

    <!-- Table header -->
    <div class="flex items-center h-7 px-3 bg-surface-0/50 border-b border-border text-xs text-text-muted font-medium flex-shrink-0">
      <div
        class="flex-1 px-1 cursor-pointer hover:text-text transition-colors flex items-center gap-0.5"
        @click="toggleSort('member')"
      >
        Member
        <ArrowUp v-if="isSortedBy('member') && sortDir === 'asc'" class="w-3 h-3" />
        <ArrowDown v-if="isSortedBy('member') && sortDir === 'desc'" class="w-3 h-3" />
      </div>
      <div
        class="w-32 flex-shrink-0 text-right px-1 cursor-pointer hover:text-text transition-colors flex items-center justify-end gap-0.5"
        @click="toggleSort('score')"
      >
        Score
        <ArrowUp v-if="isSortedBy('score') && sortDir === 'asc'" class="w-3 h-3" />
        <ArrowDown v-if="isSortedBy('score') && sortDir === 'desc'" class="w-3 h-3" />
      </div>
      <div class="w-8 flex-shrink-0" />
    </div>

    <!-- Content area: table + editor panel -->
    <div class="flex-1 min-h-0 relative flex">
      <!-- Members list -->
      <div class="flex-1 overflow-auto scrollbar-thin">
        <div
          v-for="(member, idx) in sortedMembers"
          :key="member.value"
          class="flex items-start min-h-[32px] px-3 border-b border-border/50 text-xs group hover:bg-overlay-0/50 transition-colors cursor-pointer"
          :class="{
            'bg-surface-0/30': idx % 2 === 1 && editor.activeEntry.value?.id !== member.value,
            'border-l-2 border-l-accent bg-accent-subtle': editor.activeEntry.value?.id === member.value,
            'border-l-2 border-l-transparent': editor.activeEntry.value?.id !== member.value
          }"
          @click="openEditor(member)"
        >
          <!-- Member name -->
          <div class="flex-1 px-1 py-2 min-w-0 font-mono text-text truncate" :title="member.value">
            {{ member.value }}
          </div>

          <!-- Score -->
          <div class="w-32 flex-shrink-0 text-right px-1 py-2">
            <span class="font-mono text-accent">
              {{ member.score }}
            </span>
          </div>

          <!-- Remove -->
          <div class="w-8 flex-shrink-0 flex items-center justify-center pt-2">
            <button
              class="btn-icon-sm !w-5 !h-5 hover:!bg-danger/20 hover:!text-danger opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove Member"
              @click.stop="removeMember(member.value)"
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
            class="text-xs text-accent hover:text-accent-hover transition-colors px-4 py-1.5 rounded-md hover:bg-accent-subtle"
            :disabled="loading"
            @click="loadMembers(false)"
          >
            {{ loading ? 'Loading...' : 'Load More' }}
          </button>
        </div>

        <!-- Empty state -->
        <div
          v-if="!loading && sortedMembers.length === 0"
          class="flex items-center justify-center py-8 text-text-muted text-xs"
        >
          Sorted set is empty
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
