<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useServerStore } from '@renderer/stores/server.store'
import { Search, RefreshCw, SquarePen } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const serverStore = useServerStore()

const searchQuery = ref<string>('')
const editingKey = ref<string | null>(null)
const editingValue = ref<string>('')
const modifiedKeys = ref<Set<string>>(new Set())
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
const toastTimeout = ref<number | null>(null)
const error = ref<string | null>(null)

interface ConfigEntry {
  key: string
  value: string
  modified: boolean
}

const filteredConfig = computed<ConfigEntry[]>(() => {
  const entries = Object.entries(serverStore.config)
    .map(([key, value]) => ({
      key,
      value,
      modified: modifiedKeys.value.has(key)
    }))
    .sort((a, b) => a.key.localeCompare(b.key))

  if (!searchQuery.value.trim()) return entries

  const query = searchQuery.value.toLowerCase()
  return entries.filter(
    (entry) =>
      entry.key.toLowerCase().includes(query) ||
      entry.value.toLowerCase().includes(query)
  )
})

const totalCount = computed<number>(() => Object.keys(serverStore.config).length)
const filteredCount = computed<number>(() => filteredConfig.value.length)

async function loadConfig(): Promise<void> {
  error.value = null
  try {
    await serverStore.fetchConfig(props.connectionId, '*')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load configuration'
  }
}

function startEdit(key: string, currentValue: string): void {
  editingKey.value = key
  editingValue.value = currentValue
}

function cancelEdit(): void {
  editingKey.value = null
  editingValue.value = ''
}

async function saveConfig(key: string): Promise<void> {
  try {
    await serverStore.setConfig(props.connectionId, key, editingValue.value)
    modifiedKeys.value.add(key)
    editingKey.value = null
    editingValue.value = ''
    showToast('Configuration saved successfully', 'success')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save configuration'
    showToast(message, 'error')
  }
}

function handleEditKeydown(event: KeyboardEvent, key: string): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    saveConfig(key)
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    cancelEdit()
  }
}

function showToast(message: string, type: 'success' | 'error'): void {
  if (toastTimeout.value !== null) {
    window.clearTimeout(toastTimeout.value)
  }
  toast.value = { message, type }
  toastTimeout.value = window.setTimeout(() => {
    toast.value = null
    toastTimeout.value = null
  }, 3000)
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <div class="flex items-center gap-2">
        <h2 class="text-md font-medium text-text">Server Configuration</h2>
        <span class="text-xs text-text-muted">
          {{ filteredCount }}<span v-if="searchQuery"> / {{ totalCount }}</span> parameters
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Search input -->
        <div class="relative">
          <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" :stroke-width="2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search parameters..."
            class="w-56 text-xs bg-input-bg text-text border border-border rounded pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted"
          />
        </div>

        <!-- Reload -->
        <button
          @click="loadConfig"
          :disabled="serverStore.loading"
          class="flex items-center gap-1.5 text-xs text-text-muted hover:text-text px-2 py-1.5 rounded border border-border hover:border-border-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw class="w-3 h-3" :class="serverStore.loading ? 'animate-spin' : ''" :stroke-width="2" />
          <span>Reload</span>
        </button>
      </div>
    </div>

    <!-- Error display -->
    <div
      v-if="error"
      class="mx-4 mt-3 px-3 py-2 bg-danger/10 border border-danger/30 rounded text-danger text-xs"
    >
      {{ error }}
    </div>

    <!-- Toast notification -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="toast"
        class="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-xs font-medium"
        :class="
          toast.type === 'success'
            ? 'bg-success/20 text-success border border-success/30'
            : 'bg-danger/20 text-danger border border-danger/30'
        "
      >
        {{ toast.message }}
      </div>
    </Transition>

    <!-- Config table -->
    <div class="flex-1 overflow-y-auto scrollbar-thin">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-surface-0 z-10">
          <tr class="border-b border-border">
            <th class="text-left text-text-muted font-medium px-4 py-2 w-1/3">Parameter</th>
            <th class="text-left text-text-muted font-medium px-4 py-2">Value</th>
            <th class="text-right text-text-muted font-medium px-4 py-2 w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in filteredConfig"
            :key="entry.key"
            class="border-b border-border/50 hover:bg-overlay-0/50 transition-colors"
            :class="entry.modified ? 'bg-accent/5' : ''"
          >
            <!-- Parameter name -->
            <td class="px-4 py-2 font-mono text-text">
              <div class="flex items-center gap-1.5">
                <span
                  v-if="entry.modified"
                  class="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                  title="Modified in this session"
                />
                {{ entry.key }}
              </div>
            </td>

            <!-- Value (editable) -->
            <td class="px-4 py-2">
              <div v-if="editingKey === entry.key" class="flex items-center gap-2">
                <input
                  v-model="editingValue"
                  @keydown="(e) => handleEditKeydown(e, entry.key)"
                  type="text"
                  class="flex-1 text-xs font-mono bg-input-bg text-text border border-accent rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  ref="editInput"
                  autofocus
                />
                <button
                  @click="saveConfig(entry.key)"
                  class="text-xs text-success hover:text-success/80 px-1.5 py-0.5 rounded border border-success/30 hover:bg-success/10 transition-colors"
                  title="Save (Enter)"
                >
                  Save
                </button>
                <button
                  @click="cancelEdit"
                  class="text-xs text-text-muted hover:text-text px-1.5 py-0.5 rounded border border-border hover:bg-overlay-0 transition-colors"
                  title="Cancel (Esc)"
                >
                  Cancel
                </button>
              </div>
              <span
                v-else
                class="font-mono text-text-secondary cursor-pointer hover:text-text transition-colors"
                @click="startEdit(entry.key, entry.value)"
                :title="entry.value || '(empty)'"
              >
                {{ entry.value || '(empty)' }}
              </span>
            </td>

            <!-- Actions -->
            <td class="px-4 py-2 text-right">
              <button
                v-if="editingKey !== entry.key"
                @click="startEdit(entry.key, entry.value)"
                class="text-xs text-text-muted hover:text-accent transition-colors px-1.5 py-0.5 rounded hover:bg-overlay-0"
                title="Edit value"
              >
                <SquarePen class="w-3.5 h-3.5" :stroke-width="2" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state -->
      <div
        v-if="filteredConfig.length === 0 && !serverStore.loading"
        class="flex flex-col items-center justify-center py-12 text-text-muted"
      >
        <Search class="w-8 h-8 mb-2 opacity-50" :stroke-width="1.5" />
        <p class="text-xs">
          {{ searchQuery ? 'No parameters match your search' : 'No configuration parameters found' }}
        </p>
      </div>
    </div>
  </div>
</template>
