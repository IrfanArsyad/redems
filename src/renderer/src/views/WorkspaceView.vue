<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConnectionStore } from '@renderer/stores/connection.store'
import { useUiStore } from '@renderer/stores/ui.store'
import { AlertTriangle, Loader2, FileText, X } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const connectionStore = useConnectionStore()
const uiStore = useUiStore()

const connectionId = computed(() => route.params.id as string)

const connection = computed(() =>
  connectionStore.connections.find((c) => c.id === connectionId.value)
)

const connectionState = computed(() =>
  connectionStore.getConnectionState(connectionId.value)
)

const isConnected = computed(() =>
  connectionState.value?.status === 'connected'
)

const isReconnecting = ref(false)

// Split pane state
const leftPanelWidth = ref(320)
const isDragging = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// Bottom panel state (CLI)
const bottomPanelHeight = computed(() => uiStore.bottomPanelHeight)
const bottomPanelVisible = computed(() => uiStore.bottomPanelVisible)
const isDraggingBottom = ref(false)
const startY = ref(0)
const startHeight = ref(0)

onMounted(async () => {
  // If not connected, attempt to connect
  if (!isConnected.value && connection.value) {
    try {
      await connectionStore.connect(connectionId.value)
    } catch {
      // Will show reconnect prompt
    }
  }

  // If connection doesn't exist at all, redirect to welcome
  if (!connection.value) {
    router.replace({ name: 'welcome' })
  }
})

// Watch for connection going away
watch(
  () => connectionStore.connections,
  () => {
    if (!connection.value) {
      router.replace({ name: 'welcome' })
    }
  }
)

// Unsubscribe on unmount
let unsubscribeStatus: (() => void) | null = null
onMounted(() => {
  unsubscribeStatus = connectionStore.initEventListeners()
})
onUnmounted(() => {
  if (unsubscribeStatus) unsubscribeStatus()
})

// Reconnect handler
async function handleReconnect() {
  isReconnecting.value = true
  try {
    await connectionStore.connect(connectionId.value)
  } catch {
    // Error is reflected in state
  } finally {
    isReconnecting.value = false
  }
}

function handleGoBack() {
  router.push({ name: 'welcome' })
}

// Horizontal split pane drag
function onDragStart(e: MouseEvent) {
  isDragging.value = true
  startX.value = e.clientX
  startWidth.value = leftPanelWidth.value
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onDragMove(e: MouseEvent) {
  if (!isDragging.value) return
  const delta = e.clientX - startX.value
  leftPanelWidth.value = Math.max(200, Math.min(600, startWidth.value + delta))
}

function onDragEnd() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Vertical split pane drag (bottom panel)
function onBottomDragStart(e: MouseEvent) {
  isDraggingBottom.value = true
  startY.value = e.clientY
  startHeight.value = uiStore.bottomPanelHeight
  document.addEventListener('mousemove', onBottomDragMove)
  document.addEventListener('mouseup', onBottomDragEnd)
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}

function onBottomDragMove(e: MouseEvent) {
  if (!isDraggingBottom.value) return
  const delta = startY.value - e.clientY
  uiStore.setBottomPanelHeight(startHeight.value + delta)
}

function onBottomDragEnd() {
  isDraggingBottom.value = false
  document.removeEventListener('mousemove', onBottomDragMove)
  document.removeEventListener('mouseup', onBottomDragEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}
</script>

<template>
  <div class="flex h-full flex-col bg-base">
    <!-- Not connected prompt -->
    <template v-if="!isConnected && connection">
      <div class="flex h-full flex-col items-center justify-center gap-4">
        <AlertTriangle class="h-12 w-12 text-text-muted" :stroke-width="1.5" />
        <div class="text-center">
          <h2 class="text-base font-medium text-text">Connection Lost</h2>
          <p class="mt-1 text-md text-text-muted">
            {{ connectionState?.error || `Not connected to ${connection.name}` }}
          </p>
        </div>
        <div class="flex gap-3">
          <button
            class="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-md font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            :disabled="isReconnecting"
            @click="handleReconnect"
          >
            <Loader2
              v-if="isReconnecting"
              class="h-4 w-4 animate-spin"
              :stroke-width="2"
            />
            {{ isReconnecting ? 'Reconnecting...' : 'Reconnect' }}
          </button>
          <button
            class="rounded-md border border-border px-4 py-2 text-md text-text-muted transition-colors hover:border-border-accent hover:text-text"
            @click="handleGoBack"
          >
            Go Back
          </button>
        </div>
      </div>
    </template>

    <!-- Workspace layout (when connected) -->
    <template v-else-if="isConnected && connection">
      <div class="flex flex-1 overflow-hidden">
        <!-- Left panel: Key Browser -->
        <div
          class="flex-shrink-0 overflow-hidden border-r border-border bg-surface-0"
          :style="{ width: `${leftPanelWidth}px` }"
        >
          <div class="flex h-full flex-col">
            <div class="border-b border-border px-3 py-2">
              <h2 class="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Key Browser
              </h2>
            </div>
            <div class="flex flex-1 items-center justify-center">
              <p class="text-xs text-text-muted">Key browser will be loaded here</p>
            </div>
          </div>
        </div>

        <!-- Horizontal resize handle -->
        <div
          class="relative z-10 w-0 cursor-col-resize"
          @mousedown="onDragStart"
        >
          <div
            class="absolute -left-px top-0 h-full w-[3px] transition-colors hover:bg-accent"
            :class="{ 'bg-accent': isDragging }"
          />
        </div>

        <!-- Right panel: Key Detail / Editor -->
        <div class="flex min-w-0 flex-1 flex-col">
          <!-- Main content area -->
          <div class="flex flex-1 items-center justify-center overflow-auto">
            <div class="text-center text-text-muted">
              <FileText class="mx-auto mb-3 h-10 w-10 opacity-50" :stroke-width="1.5" />
              <p class="text-md">Select a key to view its contents</p>
            </div>
          </div>

          <!-- Bottom panel resize handle -->
          <div
            v-if="bottomPanelVisible"
            class="relative z-10 h-0 cursor-row-resize"
            @mousedown="onBottomDragStart"
          >
            <div
              class="absolute -top-px left-0 h-[3px] w-full transition-colors hover:bg-accent"
              :class="{ 'bg-accent': isDraggingBottom }"
            />
          </div>

          <!-- Bottom panel: CLI -->
          <div
            v-if="bottomPanelVisible"
            class="flex-shrink-0 overflow-hidden border-t border-border bg-surface-0"
            :style="{ height: `${bottomPanelHeight}px` }"
          >
            <div class="flex h-full flex-col">
              <div class="flex items-center justify-between border-b border-border px-3 py-1.5">
                <h2 class="text-xs font-semibold uppercase tracking-wider text-text-muted">CLI</h2>
                <button
                  class="rounded p-0.5 text-text-muted transition-colors hover:bg-overlay-0 hover:text-text"
                  @click="uiStore.hideBottomPanel()"
                >
                  <X class="h-3.5 w-3.5" :stroke-width="2" />
                </button>
              </div>
              <div class="flex flex-1 items-center justify-center">
                <p class="font-mono text-xs text-text-muted">CLI terminal will be rendered here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status bar toggle for bottom panel -->
      <div
        v-if="!bottomPanelVisible"
        class="flex items-center border-t border-border bg-statusbar-bg px-3 py-1"
      >
        <button
          class="text-xs text-text-muted transition-colors hover:text-text"
          @click="uiStore.showBottomPanel()"
        >
          Toggle CLI
        </button>
      </div>
    </template>
  </div>
</template>
