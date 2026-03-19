<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useConnectionStore } from '@renderer/stores/connection.store'
import { IPC } from '@shared/constants/channels'
import { Minus, Square, Copy, X } from 'lucide-vue-next'

const connectionStore = useConnectionStore()
const isMaximized = ref(false)

async function minimize(): Promise<void> {
  await window.api.invoke(IPC.WINDOW_MINIMIZE)
}

async function maximize(): Promise<void> {
  await window.api.invoke(IPC.WINDOW_MAXIMIZE)
}

async function close(): Promise<void> {
  await window.api.invoke(IPC.WINDOW_CLOSE)
}

let unsubscribe: (() => void) | null = null

onMounted(async () => {
  isMaximized.value = await window.api.invoke(IPC.WINDOW_IS_MAXIMIZED)
  unsubscribe = window.api.on(IPC.WINDOW_MAXIMIZED_CHANGED, (maximized: boolean) => {
    isMaximized.value = maximized
  })
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<template>
  <div
    class="titlebar flex items-center h-10 bg-titlebar-bg text-text select-none border-b border-border"
    style="-webkit-app-region: drag"
  >
    <!-- Left: App brand -->
    <div class="flex items-center gap-2.5 pl-4 shrink-0">
      <!-- Redis logo mark -->
      <div class="flex items-center justify-center w-5 h-5 rounded-md bg-accent-muted">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-accent">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.7"/>
          <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
          <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="text-xs font-semibold tracking-wide text-text-secondary">Redis Manager</span>
    </div>

    <!-- Center: Active connection -->
    <div class="flex-1 flex items-center justify-center min-w-0">
      <div
        v-if="connectionStore.activeConnection"
        class="flex items-center gap-1.5 px-3 py-1 rounded-md bg-surface-0/50"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span class="text-xs text-text-secondary truncate max-w-[280px]">
          {{ connectionStore.activeConnection.name }}
        </span>
      </div>
    </div>

    <!-- Right: Window controls -->
    <div class="flex items-center shrink-0" style="-webkit-app-region: no-drag">
      <button
        class="window-btn flex items-center justify-center w-12 h-10 text-text-muted transition-colors duration-150 focus:outline-none hover:bg-overlay-0/60 hover:text-text"
        @click="minimize"
        title="Minimize"
      >
        <Minus class="w-4 h-4" :stroke-width="1.5" />
      </button>

      <button
        class="window-btn flex items-center justify-center w-12 h-10 text-text-muted transition-colors duration-150 focus:outline-none hover:bg-overlay-0/60 hover:text-text"
        @click="maximize"
        :title="isMaximized ? 'Restore' : 'Maximize'"
      >
        <Copy v-if="isMaximized" class="w-3.5 h-3.5" :stroke-width="1.5" />
        <Square v-else class="w-3.5 h-3.5" :stroke-width="1.5" />
      </button>

      <button
        class="window-btn flex items-center justify-center w-12 h-10 text-text-muted transition-colors duration-150 focus:outline-none hover:bg-red-500/90 hover:text-white"
        @click="close"
        title="Close"
      >
        <X class="w-4 h-4" :stroke-width="1.5" />
      </button>
    </div>
  </div>
</template>
