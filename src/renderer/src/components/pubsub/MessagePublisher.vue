<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePubSubStore } from '@renderer/stores/pubsub.store'
import { Send } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const pubsubStore = usePubSubStore()
const channel = ref<string>('')
const message = ref<string>('')
const publishing = ref<boolean>(false)
const recentChannels = ref<string[]>([])
const showRecent = ref<boolean>(false)
const lastResult = ref<{ success: boolean; receivers: number } | null>(null)

const canPublish = computed<boolean>(() => {
  return channel.value.trim().length > 0 && message.value.trim().length > 0 && !publishing.value
})

async function handlePublish(): Promise<void> {
  const ch = channel.value.trim()
  const msg = message.value.trim()
  if (!ch || !msg) return

  publishing.value = true
  lastResult.value = null
  try {
    const receivers = await pubsubStore.publish(props.connectionId, ch, msg)
    lastResult.value = { success: true, receivers }

    // Track recent channels
    if (!recentChannels.value.includes(ch)) {
      recentChannels.value.unshift(ch)
      if (recentChannels.value.length > 10) {
        recentChannels.value = recentChannels.value.slice(0, 10)
      }
    }

    // Clear message after publish
    message.value = ''
  } catch (err) {
    lastResult.value = { success: false, receivers: 0 }
    console.error('Publish failed:', err)
  } finally {
    publishing.value = false
  }
}

function selectRecentChannel(ch: string): void {
  channel.value = ch
  showRecent.value = false
}
</script>

<template>
  <div class="px-3 py-2 bg-surface-0">
    <div class="flex items-start gap-2">
      <!-- Channel input with recent dropdown -->
      <div class="relative">
        <input
          v-model="channel"
          type="text"
          placeholder="Channel name"
          class="w-48 px-2 py-1 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          @focus="showRecent = recentChannels.length > 0"
          @blur="setTimeout(() => showRecent = false, 150)"
        />

        <!-- Recent channels dropdown -->
        <div
          v-if="showRecent && recentChannels.length > 0"
          class="absolute top-full left-0 mt-1 w-48 bg-surface-0 border border-border rounded shadow-lg z-10 py-1"
        >
          <div class="px-2 py-1 text-xs text-text-muted uppercase tracking-wider">Recent</div>
          <button
            v-for="ch in recentChannels"
            :key="ch"
            class="block w-full text-left px-2 py-1 text-xs text-text hover:bg-overlay-0/50 truncate"
            @mousedown.prevent="selectRecentChannel(ch)"
          >
            {{ ch }}
          </button>
        </div>
      </div>

      <!-- Message input -->
      <textarea
        v-model="message"
        placeholder="Message body..."
        rows="1"
        class="flex-1 px-2 py-1 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:border-accent focus:outline-none resize-none font-mono"
        @keydown.ctrl.enter="handlePublish"
      />

      <!-- Publish button -->
      <button
        class="shrink-0 flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-success-muted text-success hover:bg-success/25 transition-colors disabled:opacity-50"
        :disabled="!canPublish"
        @click="handlePublish"
      >
        <Send class="w-3.5 h-3.5" :stroke-width="1.5" />
        {{ publishing ? 'Sending...' : 'Publish' }}
      </button>
    </div>

    <!-- Result feedback -->
    <div v-if="lastResult" class="mt-1.5">
      <span
        v-if="lastResult.success"
        class="text-xs text-success"
      >
        Published to {{ lastResult.receivers }} receiver{{ lastResult.receivers !== 1 ? 's' : '' }}
      </span>
      <span v-else class="text-xs text-danger">
        Publish failed
      </span>
    </div>
  </div>
</template>
