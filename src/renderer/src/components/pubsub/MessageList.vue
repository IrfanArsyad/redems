<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { usePubSubStore } from '@renderer/stores/pubsub.store'
import type { PubSubMessage } from '@shared/types/redis.types'
import { Search, Pause, Play, Trash2, ArrowDown, MessageSquare, Copy, Check } from 'lucide-vue-next'

const props = defineProps<{
  messages: PubSubMessage[]
}>()

const pubsubStore = usePubSubStore()
const scrollContainer = ref<HTMLDivElement | null>(null)
const autoScroll = ref<boolean>(true)
const channelFilter = ref<string>('')
const copiedIndex = ref<number | null>(null)

// Virtual scroll state
const itemHeight = 64
const scrollTop = ref<number>(0)
const visibleCount = ref<number>(20)

const filteredMessages = computed<PubSubMessage[]>(() => {
  if (!channelFilter.value) return props.messages
  const lower = channelFilter.value.toLowerCase()
  return props.messages.filter((m) => m.channel.toLowerCase().includes(lower))
})

const totalHeight = computed<number>(() => filteredMessages.value.length * itemHeight)

const startIndex = computed<number>(() => {
  return Math.max(0, Math.floor(scrollTop.value / itemHeight) - 3)
})

const endIndex = computed<number>(() => {
  return Math.min(filteredMessages.value.length, startIndex.value + visibleCount.value + 6)
})

const visibleMessages = computed(() => {
  return filteredMessages.value.slice(startIndex.value, endIndex.value).map((msg, i) => ({
    msg,
    index: startIndex.value + i
  }))
})

function onScroll(event: Event): void {
  const target = event.target as HTMLDivElement
  scrollTop.value = target.scrollTop
  const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 60
  autoScroll.value = isAtBottom
}

// Auto-scroll on new messages
watch(
  () => props.messages.length,
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

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 })
}

function isJson(str: string): boolean {
  if (!str) return false
  const trimmed = str.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed)
      return true
    } catch {
      return false
    }
  }
  return false
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

// Channel color mapping
const channelColors = [
  'bg-accent-muted text-accent',
  'bg-success-muted text-success',
  'bg-warning-muted text-warning',
  'bg-info-muted text-info',
  'bg-danger-muted text-danger',
  'bg-[#cba6f7]/15 text-[#cba6f7]',
  'bg-[#f5c2e7]/15 text-[#f5c2e7]',
  'bg-[#94e2d5]/15 text-[#94e2d5]'
]

const channelColorMap = new Map<string, string>()
let colorIndex = 0

function getChannelColor(channel: string): string {
  if (!channelColorMap.has(channel)) {
    channelColorMap.set(channel, channelColors[colorIndex % channelColors.length])
    colorIndex++
  }
  return channelColorMap.get(channel)!
}

async function copyMessage(msg: PubSubMessage, index: number): Promise<void> {
  try {
    await navigator.clipboard.writeText(msg.message)
    copiedIndex.value = index
    setTimeout(() => {
      copiedIndex.value = null
    }, 1500)
  } catch {
    // Clipboard access denied
  }
}

function handlePause(): void {
  pubsubStore.togglePause()
}

function handleClear(): void {
  pubsubStore.clearMessages()
}

function toggleAutoScroll(): void {
  autoScroll.value = !autoScroll.value
  if (autoScroll.value && scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-0">
      <span class="text-xs font-medium text-text">Messages</span>
      <div class="flex-1" />

      <!-- Channel filter -->
      <div class="relative">
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" :stroke-width="1.5" />
        <input
          v-model="channelFilter"
          type="text"
          placeholder="Filter by channel..."
          class="w-40 pl-7 pr-2 py-1 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <!-- Pause -->
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
        :class="pubsubStore.paused
          ? 'bg-warning-muted text-warning'
          : 'text-text-muted hover:text-text hover:bg-overlay-0/50'"
        @click="handlePause"
      >
        <Pause v-if="!pubsubStore.paused" class="w-3.5 h-3.5" :stroke-width="1.5" />
        <Play v-else class="w-3.5 h-3.5" :stroke-width="1.5" />
      </button>

      <!-- Clear -->
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text hover:bg-overlay-0/50 rounded transition-colors"
        @click="handleClear"
      >
        <Trash2 class="w-3.5 h-3.5" :stroke-width="1.5" />
      </button>

      <!-- Auto-scroll -->
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
        :class="autoScroll ? 'text-accent bg-accent-subtle' : 'text-text-muted hover:text-text'"
        @click="toggleAutoScroll"
        title="Auto-scroll"
      >
        <ArrowDown class="w-3.5 h-3.5" :stroke-width="1.5" />
      </button>

      <span class="text-xs text-text-muted tabular-nums">
        {{ filteredMessages.length.toLocaleString() }}
      </span>
    </div>

    <!-- Message List (virtual scroll) -->
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin"
      @scroll="onScroll"
    >
      <!-- Empty state -->
      <div
        v-if="filteredMessages.length === 0"
        class="flex flex-col items-center justify-center h-full text-text-muted"
      >
        <MessageSquare class="w-10 h-10 mb-3 opacity-30" :stroke-width="1.5" />
        <span class="text-xs">No messages yet. Subscribe to a channel to start receiving.</span>
      </div>

      <!-- Virtual scroll container -->
      <div v-else :style="{ height: `${totalHeight}px`, position: 'relative' }">
        <div
          v-for="{ msg, index } in visibleMessages"
          :key="index"
          :style="{
            position: 'absolute',
            top: `${index * itemHeight}px`,
            left: 0,
            right: 0,
            height: `${itemHeight}px`
          }"
          class="flex items-start gap-2 px-3 py-1.5 border-b border-border/30 hover:bg-overlay-0/20 group"
        >
          <!-- Timestamp -->
          <span class="text-xs text-text-muted shrink-0 mt-0.5 tabular-nums w-20">
            {{ formatTimestamp(msg.timestamp) }}
          </span>

          <!-- Channel badge -->
          <span
            class="shrink-0 px-1.5 py-0.5 text-xs rounded truncate max-w-[120px]"
            :class="getChannelColor(msg.channel)"
            :title="msg.channel"
          >
            {{ msg.channel }}
          </span>

          <!-- Pattern indicator -->
          <span
            v-if="msg.pattern"
            class="shrink-0 text-xs text-text-muted"
            :title="`Matched pattern: ${msg.pattern}`"
          >
            ({{ msg.pattern }})
          </span>

          <!-- Message body -->
          <div class="flex-1 min-w-0">
            <pre
              v-if="isJson(msg.message)"
              class="text-xs text-text font-mono whitespace-pre-wrap break-all leading-tight max-h-10 overflow-hidden"
            >{{ formatJson(msg.message) }}</pre>
            <span
              v-else
              class="text-xs text-text break-all line-clamp-2"
            >
              {{ msg.message }}
            </span>
          </div>

          <!-- Copy button -->
          <button
            class="shrink-0 p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle opacity-0 group-hover:opacity-100 transition-all"
            title="Copy message"
            @click="copyMessage(msg, index)"
          >
            <Copy v-if="copiedIndex !== index" class="w-3.5 h-3.5" :stroke-width="1.5" />
            <Check v-else class="w-3.5 h-3.5 text-success" :stroke-width="2" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
