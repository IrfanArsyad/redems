<script setup lang="ts">
import { ref, computed } from 'vue'
import { useKeysStore } from '@renderer/stores/keys.store'
import { useUiStore } from '@renderer/stores/ui.store'
import type { RedisKeyInfo } from '@shared/types/redis.types'
import { KeyRound, ArrowUp, ArrowDown } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
  keys: RedisKeyInfo[]
}>()

const keysStore = useKeysStore()
const uiStore = useUiStore()

type SortField = 'key' | 'type' | 'ttl'
type SortDir = 'asc' | 'desc'

const sortField = ref<SortField>('key')
const sortDir = ref<SortDir>('asc')

// Virtual scroll state
const scrollContainer = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(400)
const itemHeight = 34

const typeBadgeColors: Record<string, string> = {
  string: 'bg-emerald-500/12 text-emerald-400',
  hash: 'bg-sky-500/12 text-sky-400',
  list: 'bg-amber-500/12 text-amber-400',
  set: 'bg-violet-500/12 text-violet-400',
  zset: 'bg-rose-500/12 text-rose-400',
  stream: 'bg-cyan-500/12 text-cyan-400',
  unknown: 'bg-gray-500/12 text-gray-400'
}

const sortedKeys = computed(() => {
  const list = [...props.keys]
  list.sort((a, b) => {
    let cmp = 0
    switch (sortField.value) {
      case 'key':
        cmp = a.key.localeCompare(b.key)
        break
      case 'type':
        cmp = a.type.localeCompare(b.type)
        break
      case 'ttl':
        cmp = a.ttl - b.ttl
        break
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
  return list
})

// Virtual scroll
const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / itemHeight)
  const count = Math.ceil(containerHeight.value / itemHeight) + 2
  return {
    start: Math.max(0, start - 1),
    end: Math.min(sortedKeys.value.length, start + count)
  }
})

const visibleKeys = computed(() => {
  return sortedKeys.value.slice(visibleRange.value.start, visibleRange.value.end)
})

const totalHeight = computed(() => sortedKeys.value.length * itemHeight)
const offsetY = computed(() => visibleRange.value.start * itemHeight)

function onScroll(e: Event): void {
  const el = e.target as HTMLElement
  scrollTop.value = el.scrollTop
  containerHeight.value = el.clientHeight
}

function toggleSort(field: SortField): void {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

function onSelectKey(key: RedisKeyInfo): void {
  keysStore.selectKey(props.connectionId, key.key)
}

function onToggleCheck(key: RedisKeyInfo, e: Event): void {
  e.stopPropagation()
  keysStore.toggleKeySelection(key.key)
}

function onContextMenu(e: MouseEvent, key: RedisKeyInfo): void {
  e.preventDefault()
  uiStore.showContextMenu(e.clientX, e.clientY, [
    {
      label: 'Copy Key Name',
      action: () => navigator.clipboard.writeText(key.key)
    },
    {
      label: 'Rename',
      action: () => {
        const newName = prompt('Rename key:', key.key)
        if (newName && newName !== key.key) {
          keysStore.renameKey(props.connectionId, key.key, newName)
        }
      }
    },
    {
      label: 'Set TTL',
      action: () => {
        const ttl = prompt('Set TTL (seconds, -1 to persist):', String(key.ttl))
        if (ttl !== null) {
          keysStore.setExpiry(props.connectionId, key.key, parseInt(ttl))
        }
      }
    },
    { label: '', action: () => {}, separator: true },
    {
      label: 'Delete',
      danger: true,
      action: () => {
        if (confirm(`Delete key "${key.key}"?`)) {
          keysStore.deleteKeys(props.connectionId, [key.key])
        }
      }
    }
  ])
}

function formatTtl(ttl: number): string {
  if (ttl === -1) return 'Persistent'
  if (ttl === -2) return 'Expired'
  if (ttl < 60) return `${ttl}s`
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m ${ttl % 60}s`
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h ${Math.floor((ttl % 3600) / 60)}m`
  return `${Math.floor(ttl / 86400)}d ${Math.floor((ttl % 86400) / 3600)}h`
}

function formatMemory(bytes: number | undefined): string {
  if (bytes === undefined) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Column headers -->
    <div class="flex items-center h-8 px-2 bg-surface-0 border-b border-border text-xs text-text-faint font-semibold uppercase tracking-wider flex-shrink-0">
      <div class="w-7 flex-shrink-0" />
      <div
        class="flex-1 min-w-0 cursor-pointer hover:text-text-muted transition-colors px-1 flex items-center gap-1"
        @click="toggleSort('key')"
      >
        Key
        <ArrowUp v-if="sortField === 'key' && sortDir === 'asc'" class="w-3 h-3" />
        <ArrowDown v-else-if="sortField === 'key' && sortDir === 'desc'" class="w-3 h-3" />
      </div>
      <div
        class="w-16 flex-shrink-0 text-center cursor-pointer hover:text-text-muted transition-colors flex items-center justify-center gap-1"
        @click="toggleSort('type')"
      >
        Type
        <ArrowUp v-if="sortField === 'type' && sortDir === 'asc'" class="w-3 h-3" />
        <ArrowDown v-else-if="sortField === 'type' && sortDir === 'desc'" class="w-3 h-3" />
      </div>
      <div
        class="w-20 flex-shrink-0 text-right cursor-pointer hover:text-text-muted transition-colors px-1 flex items-center justify-end gap-1"
        @click="toggleSort('ttl')"
      >
        TTL
        <ArrowUp v-if="sortField === 'ttl' && sortDir === 'asc'" class="w-3 h-3" />
        <ArrowDown v-else-if="sortField === 'ttl' && sortDir === 'desc'" class="w-3 h-3" />
      </div>
      <div class="w-16 flex-shrink-0 text-right px-1">Size</div>
    </div>

    <!-- Scrollable list -->
    <div
      ref="scrollContainer"
      class="flex-1 overflow-auto scrollbar-thin"
      @scroll="onScroll"
    >
      <div :style="{ height: totalHeight + 'px', position: 'relative' }">
        <div :style="{ transform: `translateY(${offsetY}px)` }">
          <div
            v-for="(keyItem, idx) in visibleKeys"
            :key="keyItem.key"
            class="flex items-center px-2 cursor-pointer text-xs select-none group transition-colors duration-100"
            :class="{
              'bg-accent-muted text-accent': keysStore.activeKey === keyItem.key,
              'hover:bg-overlay-0/30': keysStore.activeKey !== keyItem.key,
              'bg-surface-0/20': (visibleRange.start + idx) % 2 === 1 && keysStore.activeKey !== keyItem.key
            }"
            :style="{ height: itemHeight + 'px' }"
            @click="onSelectKey(keyItem)"
            @contextmenu="onContextMenu($event, keyItem)"
          >
            <!-- Checkbox -->
            <div class="w-7 flex-shrink-0 flex items-center justify-center">
              <input
                type="checkbox"
                :checked="keysStore.selectedKeys.has(keyItem.key)"
                class="w-3.5 h-3.5 rounded border-border bg-input-bg accent-accent cursor-pointer"
                @click="onToggleCheck(keyItem, $event)"
              />
            </div>

            <!-- Key name -->
            <div class="flex-1 min-w-0 truncate px-1 font-mono text-text-secondary group-hover:text-text transition-colors">
              {{ keyItem.key }}
            </div>

            <!-- Type badge -->
            <div class="w-16 flex-shrink-0 text-center">
              <span
                class="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
                :class="typeBadgeColors[keyItem.type] || typeBadgeColors.unknown"
              >
                {{ keyItem.type }}
              </span>
            </div>

            <!-- TTL -->
            <div class="w-20 flex-shrink-0 text-right text-xs text-text-faint tabular-nums px-1">
              {{ formatTtl(keyItem.ttl) }}
            </div>

            <!-- Memory -->
            <div class="w-16 flex-shrink-0 text-right text-xs text-text-faint tabular-nums px-1">
              {{ formatMemory(keyItem.memoryUsage) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Load more -->
      <div
        v-if="keysStore.hasMore"
        class="flex items-center justify-center py-3 border-t border-border"
      >
        <button
          class="text-xs text-accent hover:text-accent-hover transition-colors px-4 py-1.5 rounded-md hover:bg-accent-subtle"
          :disabled="keysStore.loading"
          @click="keysStore.loadMore(connectionId)"
        >
          {{ keysStore.loading ? 'Loading...' : 'Load More Keys' }}
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="!keysStore.loading && keys.length === 0"
        class="flex flex-col items-center justify-center py-16 text-text-muted"
      >
        <KeyRound class="w-10 h-10 mb-3 text-text-faint" :stroke-width="1.25" />
        <span class="text-xs font-medium">No keys found</span>
        <span class="text-xs text-text-faint mt-1">Try a different search pattern</span>
      </div>
    </div>
  </div>
</template>
