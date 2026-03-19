<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Database, ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
  currentDb: number
}>()

const emit = defineEmits<{
  select: [db: number]
}>()

const isOpen = ref(false)
const dbSizes = ref<Map<number, number | null>>(new Map())
const loadingSizes = ref(false)

const databases = Array.from({ length: 16 }, (_, i) => i)

async function loadDbSize(db: number): Promise<void> {
  if (dbSizes.value.has(db)) return
  try {
    // We need to select the DB, get the size, then switch back
    // For simplicity, we load only the current DB size on mount
    // and lazy-load others on dropdown open
    const size = await window.api.invoke('server:dbsize', props.connectionId)
    dbSizes.value.set(props.currentDb, size)
  } catch {
    dbSizes.value.set(db, null)
  }
}

async function loadAllSizes(): Promise<void> {
  if (loadingSizes.value) return
  loadingSizes.value = true
  try {
    // Load current DB size
    const size = await window.api.invoke('server:dbsize', props.connectionId)
    dbSizes.value.set(props.currentDb, size)
  } catch {
    // Ignore errors
  } finally {
    loadingSizes.value = false
  }
}

onMounted(() => {
  loadAllSizes()
})

function toggleDropdown(): void {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    loadAllSizes()
  }
}

function selectDb(db: number): void {
  isOpen.value = false
  if (db !== props.currentDb) {
    emit('select', db)
  }
}

function onClickOutside(): void {
  isOpen.value = false
}

function formatSize(size: number | null | undefined): string {
  if (size === null || size === undefined) return ''
  return `(${size})`
}
</script>

<template>
  <div class="relative" v-click-outside="onClickOutside">
    <!-- Trigger button -->
    <button
      class="flex items-center gap-1 h-7 px-2 text-xs bg-input-bg border border-border rounded text-text hover:border-border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
      @click="toggleDropdown"
    >
      <Database class="w-3.5 h-3.5 text-text-muted" :stroke-width="2" />
      <span>DB {{ currentDb }}</span>
      <span v-if="dbSizes.get(currentDb) !== undefined" class="text-text-muted text-xs">
        {{ formatSize(dbSizes.get(currentDb) ?? null) }}
      </span>
      <ChevronDown class="w-3 h-3 text-text-muted" :stroke-width="2" />
    </button>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute top-full left-0 mt-1 w-36 bg-surface-0 border border-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-auto scrollbar-thin"
    >
      <button
        v-for="db in databases"
        :key="db"
        class="flex items-center justify-between w-full px-3 py-1.5 text-xs transition-colors"
        :class="{
          'bg-accent-subtle text-accent': db === currentDb,
          'text-text hover:bg-overlay-0': db !== currentDb
        }"
        @click="selectDb(db)"
      >
        <span>DB {{ db }}</span>
        <span
          v-if="dbSizes.get(db) !== undefined"
          class="text-xs text-text-muted"
        >
          {{ dbSizes.get(db) ?? '-' }}
        </span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
// v-click-outside directive
export default {
  directives: {
    'click-outside': {
      mounted(el: HTMLElement, binding: any) {
        el._clickOutsideHandler = (event: MouseEvent) => {
          if (!el.contains(event.target as Node)) {
            binding.value()
          }
        }
        document.addEventListener('click', el._clickOutsideHandler)
      },
      unmounted(el: HTMLElement) {
        if (el._clickOutsideHandler) {
          document.removeEventListener('click', el._clickOutsideHandler)
          delete el._clickOutsideHandler
        }
      }
    }
  }
}
</script>
