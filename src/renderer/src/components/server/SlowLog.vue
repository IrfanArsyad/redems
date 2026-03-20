<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useServerStore } from '@renderer/stores/server.store'
import type { RedisSlowLogEntry } from '@shared/types/redis.types'
import { RefreshCw, ChevronUp, Clock, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const serverStore = useServerStore()

const sortColumn = ref<'id' | 'timestamp' | 'duration'>('timestamp')
const sortDirection = ref<'asc' | 'desc'>('desc')
const selectedCount = ref<number>(25)
const error = ref<string | null>(null)

const countOptions = [10, 25, 50, 100]

const sortedEntries = computed<RedisSlowLogEntry[]>(() => {
  const entries = [...serverStore.slowLog]

  entries.sort((a, b) => {
    let comparison = 0
    switch (sortColumn.value) {
      case 'id':
        comparison = a.id - b.id
        break
      case 'timestamp':
        comparison = a.timestamp - b.timestamp
        break
      case 'duration':
        comparison = a.duration - b.duration
        break
    }
    return sortDirection.value === 'asc' ? comparison : -comparison
  })

  return entries
})

function toggleSort(column: 'id' | 'timestamp' | 'duration'): void {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${h}:${m}:${s}`
}

function formatDuration(microseconds: number): string {
  if (microseconds < 1000) {
    return `${microseconds}\u00B5s`
  }
  if (microseconds < 1000000) {
    return `${(microseconds / 1000).toFixed(1)}ms`
  }
  return `${(microseconds / 1000000).toFixed(2)}s`
}

function durationColorClass(microseconds: number): string {
  // green < 1ms, yellow < 10ms, red >= 10ms
  if (microseconds < 1000) return 'text-success'
  if (microseconds < 10000) return 'text-warning'
  return 'text-danger'
}

function formatCommand(args: string[]): string {
  if (!args || args.length === 0) return ''
  return args.join(' ')
}

async function loadSlowLog(): Promise<void> {
  error.value = null
  try {
    await serverStore.fetchSlowLog(props.connectionId, selectedCount.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch slow log'
  }
}

function onCountChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  selectedCount.value = Number(target.value)
  loadSlowLog()
}

onMounted(() => {
  loadSlowLog()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <div class="flex items-center gap-2">
        <h2 class="text-md font-medium text-text">Slow Log</h2>
        <span class="text-xs text-text-muted bg-overlay-0 px-1.5 py-0.5 rounded-full">
          {{ serverStore.slowLog.length }} entries
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Count selector -->
        <div class="flex items-center gap-1.5">
          <label class="text-xs text-text-muted">Show:</label>
          <select
            :value="selectedCount"
            @change="onCountChange"
            class="text-xs bg-input-bg text-text border border-border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option v-for="count in countOptions" :key="count" :value="count">
              {{ count }}
            </option>
          </select>
        </div>

        <!-- Refresh button -->
        <button
          @click="loadSlowLog"
          :disabled="serverStore.loading"
          class="flex items-center gap-1.5 text-xs text-text-muted hover:text-text px-2 py-1.5 rounded border border-border hover:border-border-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw class="w-3 h-3" :class="serverStore.loading ? 'animate-spin' : ''" :stroke-width="2" />
          <span>Refresh</span>
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

    <!-- Table -->
    <div class="flex-1 overflow-auto scrollbar-thin">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-surface-0 z-10">
          <tr class="border-b border-border">
            <th
              @click="toggleSort('id')"
              class="text-left text-text-muted font-medium px-4 py-2 w-16 cursor-pointer hover:text-text transition-colors select-none"
            >
              <div class="flex items-center gap-1">
                ID
                <ChevronUp
                  v-if="sortColumn === 'id'"
                  class="w-3 h-3 text-accent"
                  :class="sortDirection === 'desc' ? 'rotate-180' : ''"
                  :stroke-width="2"
                />
              </div>
            </th>
            <th
              @click="toggleSort('timestamp')"
              class="text-left text-text-muted font-medium px-4 py-2 w-44 cursor-pointer hover:text-text transition-colors select-none"
            >
              <div class="flex items-center gap-1">
                Timestamp
                <ChevronUp
                  v-if="sortColumn === 'timestamp'"
                  class="w-3 h-3 text-accent"
                  :class="sortDirection === 'desc' ? 'rotate-180' : ''"
                  :stroke-width="2"
                />
              </div>
            </th>
            <th
              @click="toggleSort('duration')"
              class="text-left text-text-muted font-medium px-4 py-2 w-24 cursor-pointer hover:text-text transition-colors select-none"
            >
              <div class="flex items-center gap-1">
                Duration
                <ChevronUp
                  v-if="sortColumn === 'duration'"
                  class="w-3 h-3 text-accent"
                  :class="sortDirection === 'desc' ? 'rotate-180' : ''"
                  :stroke-width="2"
                />
              </div>
            </th>
            <th class="text-left text-text-muted font-medium px-4 py-2">Command</th>
            <th class="text-left text-text-muted font-medium px-4 py-2 w-40">Client</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in sortedEntries"
            :key="entry.id"
            class="border-b border-border/50 hover:bg-overlay-0/50 transition-colors"
          >
            <td class="px-4 py-2 font-mono text-text-muted">{{ entry.id }}</td>
            <td class="px-4 py-2 text-text-secondary">{{ formatTimestamp(entry.timestamp) }}</td>
            <td class="px-4 py-2 font-mono font-medium" :class="durationColorClass(entry.duration)">
              {{ formatDuration(entry.duration) }}
            </td>
            <td class="px-4 py-2">
              <div class="font-mono text-text truncate max-w-md" :title="formatCommand(entry.args)">
                <span class="text-accent">{{ entry.args[0] }}</span>
                <span v-if="entry.args.length > 1" class="text-text-secondary ml-1">
                  {{ entry.args.slice(1).join(' ') }}
                </span>
              </div>
            </td>
            <td class="px-4 py-2 font-mono text-text-muted">
              <div class="truncate" :title="entry.clientAddr">
                {{ entry.clientAddr || '-' }}
                <span v-if="entry.clientName" class="text-text-secondary ml-1">({{ entry.clientName }})</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state -->
      <div
        v-if="sortedEntries.length === 0 && !serverStore.loading"
        class="flex flex-col items-center justify-center py-12 text-text-muted"
      >
        <Clock class="w-8 h-8 mb-2 opacity-50" :stroke-width="1.5" />
        <p class="text-xs">No slow log entries found</p>
        <p class="text-xs mt-1">
          Commands slower than the slowlog-log-slower-than threshold will appear here.
        </p>
      </div>

      <!-- Loading state -->
      <div v-if="serverStore.loading && serverStore.slowLog.length === 0" class="flex items-center justify-center py-12">
        <Loader2 class="w-6 h-6 text-accent animate-spin" :stroke-width="3" />
      </div>
    </div>
  </div>
</template>
