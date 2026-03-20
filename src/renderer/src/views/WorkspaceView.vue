<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConnectionStore } from '@renderer/stores/connection.store'
import { useUiStore } from '@renderer/stores/ui.store'
import KeyBrowser from '@renderer/components/keys/KeyBrowser.vue'
import CLIPanel from '@renderer/components/cli/CLIPanel.vue'
import ServerInfo from '@renderer/components/server/ServerInfo.vue'
import SlowLog from '@renderer/components/server/SlowLog.vue'
import ClientList from '@renderer/components/server/ClientList.vue'
import PubSubPanel from '@renderer/components/pubsub/PubSubPanel.vue'
import MonitorPanel from '@renderer/components/monitor/MonitorPanel.vue'
import MemoryAnalyzer from '@renderer/components/monitor/MemoryAnalyzer.vue'
import ClusterOverview from '@renderer/components/cluster/ClusterOverview.vue'
import {
  AlertTriangle, Loader2, X,
  Key, Server, Radio, Activity, Network, Terminal, HardDrive,
  Info, Clock3, Users
} from 'lucide-vue-next'

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

// Main panel tab
type MainTab = 'keys' | 'server' | 'pubsub' | 'monitor' | 'memory' | 'cluster'
const activeMainTab = ref<MainTab>('keys')

// Server sub-tab
type ServerSubTab = 'info' | 'slowlog' | 'clients'
const activeServerTab = ref<ServerSubTab>('info')

const mainTabs: Array<{ id: MainTab; label: string; icon: any }> = [
  { id: 'keys', label: 'Keys', icon: Key },
  { id: 'server', label: 'Server', icon: Server },
  { id: 'pubsub', label: 'PubSub', icon: Radio },
  { id: 'monitor', label: 'Monitor', icon: Activity },
  { id: 'memory', label: 'Memory', icon: HardDrive },
  { id: 'cluster', label: 'Cluster', icon: Network }
]

const serverSubTabs: Array<{ id: ServerSubTab; label: string; icon: any }> = [
  { id: 'info', label: 'Info', icon: Info },
  { id: 'slowlog', label: 'Slow Log', icon: Clock3 },
  { id: 'clients', label: 'Clients', icon: Users }
]

// Bottom panel state (CLI)
const bottomPanelHeight = computed(() => uiStore.bottomPanelHeight)
const bottomPanelVisible = computed(() => uiStore.bottomPanelVisible)
const isDraggingBottom = ref(false)
const startY = ref(0)
const startHeight = ref(0)

onMounted(async () => {
  if (!isConnected.value && connection.value) {
    try {
      await connectionStore.connect(connectionId.value)
    } catch {
      // Will show reconnect prompt
    }
  }
  if (!connection.value) {
    router.replace({ name: 'welcome' })
  }
})

watch(
  () => connectionStore.connections,
  () => {
    if (!connection.value) {
      router.replace({ name: 'welcome' })
    }
  }
)

let unsubscribeStatus: (() => void) | null = null
onMounted(() => {
  unsubscribeStatus = connectionStore.initEventListeners()
})
onUnmounted(() => {
  if (unsubscribeStatus) unsubscribeStatus()
})

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
          <h2 class="text-md font-medium text-text">Connection Lost</h2>
          <p class="mt-1 text-xs text-text-muted">
            {{ connectionState?.error || `Not connected to ${connection.name}` }}
          </p>
        </div>
        <div class="flex gap-3">
          <button
            class="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
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
            class="rounded-md border border-border px-4 py-2 text-xs text-text-muted transition-colors hover:border-border-accent hover:text-text"
            @click="handleGoBack"
          >
            Go Back
          </button>
        </div>
      </div>
    </template>

    <!-- Workspace layout (when connected) -->
    <template v-else-if="isConnected && connection">
      <!-- Main tab bar -->
      <div class="flex items-center gap-0.5 px-2 py-1 bg-mantle border-b border-border flex-shrink-0">
        <button
          v-for="tab in mainTabs"
          :key="tab.id"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
          :class="activeMainTab === tab.id
            ? 'bg-surface-0 text-accent shadow-sm'
            : 'text-text-muted hover:text-text hover:bg-overlay-0/30'"
          @click="activeMainTab = tab.id"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5" :stroke-width="2" />
          {{ tab.label }}
        </button>

        <div class="flex-1" />

        <!-- CLI toggle -->
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
          :class="bottomPanelVisible
            ? 'bg-surface-0 text-accent shadow-sm'
            : 'text-text-muted hover:text-text hover:bg-overlay-0/30'"
          @click="uiStore.toggleBottomPanel()"
        >
          <Terminal class="w-3.5 h-3.5" :stroke-width="2" />
          CLI
        </button>
      </div>

      <!-- Content area -->
      <div class="flex flex-1 min-h-0 flex-col">
        <!-- Main panel content -->
        <div class="flex-1 min-h-0 overflow-hidden">
          <!-- Keys panel -->
          <KeyBrowser
            v-if="activeMainTab === 'keys'"
            :connection-id="connectionId"
          />

          <!-- Server panel -->
          <div v-else-if="activeMainTab === 'server'" class="flex flex-col h-full">
            <!-- Server sub-tabs -->
            <div class="flex items-center gap-0.5 px-3 py-1.5 bg-surface-0 border-b border-border flex-shrink-0">
              <button
                v-for="tab in serverSubTabs"
                :key="tab.id"
                class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors"
                :class="activeServerTab === tab.id
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-muted hover:text-text hover:bg-overlay-0/30'"
                @click="activeServerTab = tab.id"
              >
                <component :is="tab.icon" class="w-3 h-3" :stroke-width="2" />
                {{ tab.label }}
              </button>
            </div>
            <div class="flex-1 min-h-0 overflow-auto">
              <ServerInfo
                v-if="activeServerTab === 'info'"
                :connection-id="connectionId"
              />
              <SlowLog
                v-else-if="activeServerTab === 'slowlog'"
                :connection-id="connectionId"
              />
              <ClientList
                v-else-if="activeServerTab === 'clients'"
                :connection-id="connectionId"
              />
            </div>
          </div>

          <!-- PubSub panel -->
          <PubSubPanel
            v-else-if="activeMainTab === 'pubsub'"
            :connection-id="connectionId"
          />

          <!-- Monitor panel -->
          <MonitorPanel
            v-else-if="activeMainTab === 'monitor'"
            :connection-id="connectionId"
          />

          <!-- Memory panel -->
          <MemoryAnalyzer
            v-else-if="activeMainTab === 'memory'"
            :connection-id="connectionId"
          />

          <!-- Cluster panel -->
          <ClusterOverview
            v-else-if="activeMainTab === 'cluster'"
            :connection-id="connectionId"
          />
        </div>

        <!-- Bottom panel resize handle -->
        <div
          v-if="bottomPanelVisible"
          class="relative z-10 h-0 cursor-row-resize flex-shrink-0"
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
          class="flex-shrink-0 overflow-hidden border-t border-border"
          :style="{ height: `${bottomPanelHeight}px` }"
        >
          <CLIPanel :connection-id="connectionId" />
        </div>
      </div>
    </template>
  </div>
</template>
