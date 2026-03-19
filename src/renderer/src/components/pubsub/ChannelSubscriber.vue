<script setup lang="ts">
import { ref } from 'vue'
import { usePubSubStore } from '@renderer/stores/pubsub.store'
import { Bell, X } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const pubsubStore = usePubSubStore()
const channelInput = ref<string>('')
const patternInput = ref<string>('')
const subscribeError = ref<string | null>(null)

async function handleSubscribe(): Promise<void> {
  const ch = channelInput.value.trim()
  if (!ch) return
  subscribeError.value = null
  try {
    await pubsubStore.subscribe(props.connectionId, ch)
    channelInput.value = ''
  } catch (err) {
    subscribeError.value = err instanceof Error ? err.message : 'Subscribe failed'
  }
}

async function handlePsubscribe(): Promise<void> {
  const pat = patternInput.value.trim()
  if (!pat) return
  subscribeError.value = null
  try {
    await pubsubStore.psubscribe(props.connectionId, pat)
    patternInput.value = ''
  } catch (err) {
    subscribeError.value = err instanceof Error ? err.message : 'Pattern subscribe failed'
  }
}

async function handleUnsubscribe(channel: string, isPattern: boolean): Promise<void> {
  try {
    if (isPattern) {
      await pubsubStore.punsubscribe(props.connectionId, channel)
    } else {
      await pubsubStore.unsubscribe(props.connectionId, channel)
    }
  } catch (err) {
    console.error('Unsubscribe error:', err)
  }
}

function getMessageCount(channel: string): number {
  return pubsubStore.channelMessageCounts[channel] || 0
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="px-3 py-2 border-b border-border bg-surface-0">
      <span class="text-xs font-medium text-text">Subscriptions</span>
    </div>

    <!-- Subscribe form -->
    <div class="p-3 space-y-2 border-b border-border">
      <!-- Channel subscribe -->
      <div class="flex items-center gap-1">
        <input
          v-model="channelInput"
          type="text"
          placeholder="Channel name"
          class="flex-1 px-2 py-1 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          @keydown.enter="handleSubscribe"
        />
        <button
          class="shrink-0 px-2 py-1 text-xs font-medium rounded bg-accent-muted text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
          :disabled="!channelInput.trim()"
          @click="handleSubscribe"
        >
          SUB
        </button>
      </div>

      <!-- Pattern subscribe -->
      <div class="flex items-center gap-1">
        <input
          v-model="patternInput"
          type="text"
          placeholder="Pattern (e.g. user:*)"
          class="flex-1 px-2 py-1 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          @keydown.enter="handlePsubscribe"
        />
        <button
          class="shrink-0 px-2 py-1 text-xs font-medium rounded bg-info-muted text-info hover:bg-info/25 transition-colors disabled:opacity-50"
          :disabled="!patternInput.trim()"
          @click="handlePsubscribe"
        >
          PSUB
        </button>
      </div>

      <!-- Error -->
      <div v-if="subscribeError" class="text-xs text-danger">
        {{ subscribeError }}
      </div>
    </div>

    <!-- Active subscriptions list -->
    <div class="flex-1 overflow-y-auto scrollbar-thin">
      <div
        v-if="pubsubStore.subscriptions.length === 0"
        class="flex flex-col items-center justify-center h-full text-text-muted px-4"
      >
        <Bell class="w-8 h-8 mb-2 opacity-30" :stroke-width="1.5" />
        <span class="text-xs text-center">No active subscriptions</span>
      </div>

      <div
        v-for="sub in pubsubStore.subscriptions"
        :key="`${sub.isPattern ? 'p:' : 'c:'}${sub.channel}`"
        class="flex items-center gap-2 px-3 py-2 border-b border-border/50 hover:bg-overlay-0/30 group"
      >
        <!-- Type indicator -->
        <span
          class="shrink-0 px-1.5 py-0.5 text-xs font-medium rounded"
          :class="sub.isPattern
            ? 'bg-info-muted text-info'
            : 'bg-accent-muted text-accent'"
        >
          {{ sub.isPattern ? 'PAT' : 'CH' }}
        </span>

        <!-- Channel name -->
        <span class="flex-1 text-xs text-text truncate font-mono" :title="sub.channel">
          {{ sub.channel }}
        </span>

        <!-- Message count badge -->
        <span
          v-if="getMessageCount(sub.channel) > 0"
          class="shrink-0 px-1.5 py-0.5 text-xs font-medium bg-accent-muted text-accent rounded-full tabular-nums"
        >
          {{ getMessageCount(sub.channel) }}
        </span>

        <!-- Unsubscribe button -->
        <button
          class="shrink-0 p-0.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all"
          title="Unsubscribe"
          @click="handleUnsubscribe(sub.channel, sub.isPattern)"
        >
          <X class="w-3.5 h-3.5" :stroke-width="1.5" />
        </button>
      </div>
    </div>

    <!-- Footer: total count -->
    <div class="px-3 py-1.5 border-t border-border bg-surface-0">
      <span class="text-xs text-text-muted">
        {{ pubsubStore.subscriptions.length }} subscription{{ pubsubStore.subscriptions.length !== 1 ? 's' : '' }}
        &middot;
        {{ pubsubStore.messageCount.toLocaleString() }} total messages
      </span>
    </div>
  </div>
</template>
