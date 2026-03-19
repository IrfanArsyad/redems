<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useMonitorStore } from '@renderer/stores/monitor.store'
import type { MonitorEntry } from '@shared/types/redis.types'
import { Play, Square, Pause, Trash2, Search, ArrowDown, FileText } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const monitorStore = useMonitorStore()
const scrollContainer = ref<HTMLDivElement | null>(null)
const autoScroll = ref<boolean>(true)
const filterInput = ref<string>('')

// Virtual scroll state
const itemHeight = 28
const visibleCount = ref<number>(30)
const scrollTop = ref<number>(0)

const displayEntries = computed<MonitorEntry[]>(() => monitorStore.filteredEntries)

const totalHeight = computed<number>(() => displayEntries.value.length * itemHeight)

const startIndex = computed<number>(() => {
  return Math.max(0, Math.floor(scrollTop.value / itemHeight) - 5)
})

const endIndex = computed<number>(() => {
  return Math.min(displayEntries.value.length, startIndex.value + visibleCount.value + 10)
})

const visibleEntries = computed(() => {
  return displayEntries.value.slice(startIndex.value, endIndex.value).map((entry, i) => ({
    entry,
    index: startIndex.value + i
  }))
})

function onScroll(event: Event): void {
  const target = event.target as HTMLDivElement
  scrollTop.value = target.scrollTop

  // Detect if user scrolled away from bottom
  const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50
  autoScroll.value = isAtBottom
}

function updateVisibleCount(): void {
  if (scrollContainer.value) {
    visibleCount.value = Math.ceil(scrollContainer.value.clientHeight / itemHeight) + 2
  }
}

// Auto-scroll when new entries arrive
watch(
  () => monitorStore.entryCount,
  () => {
    if (autoScroll.value && scrollContainer.value) {
      nextTick(() => {
        if (scrollContainer.value) {
          scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
        }
      })
    }
  }
)

watch(filterInput, (val) => {
  monitorStore.setFilter(val)
})

async function handleStart(): Promise<void> {
  await monitorStore.startMonitor(props.connectionId)
}

async function handleStop(): Promise<void> {
  await monitorStore.stopMonitor(props.connectionId)
}

function handlePause(): void {
  monitorStore.togglePause()
}

function handleClear(): void {
  monitorStore.clearEntries()
}

function toggleAutoScroll(): void {
  autoScroll.value = !autoScroll.value
  if (autoScroll.value && scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 })
}

function colorForCommand(cmd: string): string {
  const upper = cmd.toUpperCase()
  if (['GET', 'MGET', 'HGET', 'HGETALL', 'LRANGE', 'SMEMBERS', 'ZRANGE', 'XRANGE'].includes(upper)) return 'text-success'
  if (['SET', 'MSET', 'HSET', 'LPUSH', 'RPUSH', 'SADD', 'ZADD', 'XADD'].includes(upper)) return 'text-accent'
  if (['DEL', 'HDEL', 'LREM', 'SREM', 'ZREM', 'XDEL', 'FLUSHDB', 'FLUSHALL'].includes(upper)) return 'text-danger'
  if (['SUBSCRIBE', 'UNSUBSCRIBE', 'PUBLISH', 'PSUBSCRIBE'].includes(upper)) return 'text-warning'
  if (['MONITOR', 'INFO', 'CONFIG', 'DBSIZE', 'SLOWLOG'].includes(upper)) return 'text-info'
  return 'text-text-secondary'
}

onUnmounted(() => {
  // Store cleanup is handled externally if needed
})
</script>

<template>
  <div class="flex flex-col h-full bg-base">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-0">
      <!-- Start/Stop -->
      <button
        v-if="!monitorStore.running"
        class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-success-muted text-success hover:bg-success/25 transition-all duration-200"
        @click="handleStart"
      >
        <Play class="w-3.5 h-3.5" fill="currentColor" />
        Start
      </button>
      <button
        v-else
        class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-danger-muted text-danger hover:bg-danger/25 transition-all duration-200"
        @click="handleStop"
      >
        <Square class="w-3.5 h-3.5" fill="currentColor" />
        Stop
      </button>

      <!-- Pause -->
      <button
        class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all duration-200"
        :class="monitorStore.paused
          ? 'bg-warning-muted text-warning hover:bg-warning/25'
          : 'bg-overlay-0 text-text-secondary hover:bg-overlay-0/80 hover:text-text'"
        :disabled="!monitorStore.running"
        @click="handlePause"
      >
        <Pause v-if="!monitorStore.paused" class="w-3.5 h-3.5" />
        <Play v-else class="w-3.5 h-3.5" fill="currentColor" />
        {{ monitorStore.paused ? 'Resume' : 'Pause' }}
      </button>

      <!-- Clear -->
      <button
        class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-overlay-0 text-text-secondary hover:bg-overlay-0/80 hover:text-text transition-all duration-200"
        @click="handleClear"
      >
        <Trash2 class="w-3.5 h-3.5" />
        Clear
      </button>

      <div class="flex-1" />

      <!-- Filter -->
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        <input
          v-model="filterInput"
          type="text"
          placeholder="Filter commands..."
          class="w-48 pl-8 pr-2 py-1 text-xs bg-input-bg border border-border rounded-full text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all duration-200"
        />
      </div>

      <!-- Auto-scroll toggle -->
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-all duration-200"
        :class="autoScroll ? 'text-accent bg-accent-subtle' : 'text-text-muted hover:text-text hover:bg-overlay-0'"
        @click="toggleAutoScroll"
        title="Auto-scroll"
      >
        <ArrowDown class="w-3.5 h-3.5" />
      </button>

      <!-- Entry count -->
      <span class="text-xs text-text-muted tabular-nums">
        {{ monitorStore.entryCount.toLocaleString() }} entries
      </span>
    </div>

    <!-- Monitor Output (virtual scroll) -->
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto overflow-x-hidden font-mono text-xs scrollbar-thin"
      @scroll="onScroll"
      @resize="updateVisibleCount"
    >
      <!-- Empty state -->
      <div
        v-if="displayEntries.length === 0"
        class="flex flex-col items-center justify-center h-full text-text-muted"
      >
        <FileText class="w-10 h-10 mb-3 opacity-30" />
        <span class="text-xs">
          {{ monitorStore.running ? 'Waiting for commands...' : 'Click Start to begin monitoring' }}
        </span>
      </div>

      <!-- Virtual scroll container -->
      <div v-else :style="{ height: `${totalHeight}px`, position: 'relative' }">
        <div
          v-for="{ entry, index } in visibleEntries"
          :key="index"
          :style="{
            position: 'absolute',
            top: `${index * itemHeight}px`,
            left: 0,
            right: 0,
            height: `${itemHeight}px`
          }"
          class="flex items-center gap-2 px-3 hover:bg-overlay-0/30 border-b border-border/30"
        >
          <!-- Timestamp -->
          <span class="text-text-muted shrink-0 w-24 tabular-nums">
            {{ formatTimestamp(entry.timestamp) }}
          </span>

          <!-- DB -->
          <span class="text-info shrink-0 w-8 text-center">
            db{{ entry.db }}
          </span>

          <!-- Client -->
          <span class="text-text-muted shrink-0 w-36 truncate" :title="entry.client">
            {{ entry.client }}
          </span>

          <!-- Command -->
          <span class="font-semibold shrink-0" :class="colorForCommand(entry.command)">
            {{ entry.command.toUpperCase() }}
          </span>

          <!-- Args -->
          <span class="text-text-secondary truncate">
            {{ entry.args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
