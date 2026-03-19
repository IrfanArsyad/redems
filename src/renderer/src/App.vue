<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@renderer/stores/settings.store'
import { useConnectionStore } from '@renderer/stores/connection.store'
import { useUiStore } from '@renderer/stores/ui.store'
import { useTheme } from '@renderer/composables/useTheme'
import { useNotification } from '@renderer/composables/useNotification'
import type { ConnectionConfig } from '@shared/types/connection.types'
import { TooltipProvider } from 'radix-vue'
import { Database, Plus } from 'lucide-vue-next'

import AppTitleBar from '@renderer/components/common/AppTitleBar.vue'
import AppSidebar from '@renderer/components/common/AppSidebar.vue'
import TabBar from '@renderer/components/common/TabBar.vue'
import StatusBar from '@renderer/components/common/StatusBar.vue'
import ContextMenu from '@renderer/components/common/ContextMenu.vue'
import ConnectionForm from '@renderer/components/connection/ConnectionForm.vue'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'

// Tab content components
import KeyBrowser from '@renderer/components/keys/KeyBrowser.vue'
import ServerInfo from '@renderer/components/server/ServerInfo.vue'
import CLIPanel from '@renderer/components/cli/CLIPanel.vue'
import MonitorPanel from '@renderer/components/monitor/MonitorPanel.vue'
import PubSubPanel from '@renderer/components/pubsub/PubSubPanel.vue'
import ClusterOverview from '@renderer/components/cluster/ClusterOverview.vue'
import SettingsPanel from '@renderer/components/settings/SettingsPanel.vue'

const settingsStore = useSettingsStore()
const connectionStore = useConnectionStore()
const uiStore = useUiStore()
const { applyThemeClass } = useTheme()

// Connection form state
const showConnectionForm = ref(false)
const editingConnection = ref<ConnectionConfig | null>(null)
const formRef = ref<InstanceType<typeof ConnectionForm> | null>(null)

// Sidebar resize state
const sidebarWidth = ref(260)
const isDraggingSidebar = ref(false)
const startX = ref(0)
const startWidth = ref(0)
const isSidebarHoverHandle = ref(false)

// Active tab data
const activeTabData = computed(() => uiStore.activeTabData)

// Context menu
const contextMenuConn = ref<ConnectionConfig | null>(null)

let unsubscribeStatus: (() => void) | null = null

onMounted(() => {
  settingsStore.applyTheme()
  applyThemeClass()
  connectionStore.loadConnections()
  unsubscribeStatus = connectionStore.initEventListeners()
})

onUnmounted(() => {
  if (unsubscribeStatus) unsubscribeStatus()
})

// --- Connection actions ---
const { success: notifySuccess, error: notifyError } = useNotification()

// Confirm dialog state
const confirmDialog = ref<{
  visible: boolean
  title: string
  message: string
  confirmText: string
  variant: 'default' | 'danger'
  onConfirm: () => void
}>({
  visible: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  variant: 'default',
  onConfirm: () => {}
})

function showConfirm(opts: {
  title: string
  message: string
  confirmText: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
}) {
  confirmDialog.value = {
    visible: true,
    title: opts.title,
    message: opts.message,
    confirmText: opts.confirmText,
    variant: opts.variant ?? 'default',
    onConfirm: opts.onConfirm
  }
}

function handleConfirmDialogConfirm() {
  confirmDialog.value.onConfirm()
  confirmDialog.value.visible = false
}

function handleConfirmDialogCancel() {
  confirmDialog.value.visible = false
}

function handleConnectionClick(conn: ConnectionConfig) {
  uiStore.hideContextMenu()
  const state = connectionStore.getConnectionState(conn.id)
  const status = state?.status ?? 'disconnected'

  if (status === 'connected') {
    connectionStore.setActiveConnection(conn.id)
    openKeysTab(conn)
  } else if (status === 'disconnected' || status === 'error') {
    handleConnectionConnect(conn)
  }
}

function handleConnectionConnect(conn: ConnectionConfig) {
  const state = connectionStore.getConnectionState(conn.id)
  const status = state?.status ?? 'disconnected'
  if (status === 'connected' || status === 'connecting') return

  showConfirm({
    title: 'Connect',
    message: `Connect to "${conn.name}" (${conn.host}:${conn.port})?`,
    confirmText: 'Connect',
    onConfirm: async () => {
      try {
        await connectionStore.connect(conn.id)
        openKeysTab(conn)
        notifySuccess('Connected', `Connected to ${conn.name}`)
      } catch {
        notifyError('Connection failed', `Could not connect to ${conn.name}`)
      }
    }
  })
}

function handleConnectionDisconnect(conn: ConnectionConfig) {
  showConfirm({
    title: 'Disconnect',
    message: `Disconnect from "${conn.name}"? All open tabs for this connection will be closed.`,
    confirmText: 'Disconnect',
    variant: 'danger',
    onConfirm: () => {
      connectionStore.disconnect(conn.id)
      uiStore.removeTabsByConnection(conn.id)
      notifySuccess('Disconnected', `Disconnected from ${conn.name}`)
    }
  })
}

function openKeysTab(conn: ConnectionConfig) {
  uiStore.addTab({
    id: `keys-${conn.id}`,
    title: conn.name,
    type: 'keys',
    connectionId: conn.id
  })
}

function handleContextMenu(event: MouseEvent, conn: ConnectionConfig) {
  contextMenuConn.value = conn
  const state = connectionStore.getConnectionState(conn.id)
  const isConnected = state?.status === 'connected'

  uiStore.showContextMenu(event.clientX, event.clientY, [
    {
      label: isConnected ? 'Disconnect' : 'Connect',
      action: () => {
        if (isConnected) {
          handleConnectionDisconnect(conn)
        } else {
          handleConnectionConnect(conn)
        }
      }
    },
    ...(isConnected
      ? [
          {
            label: 'Server Info',
            action: () => {
              connectionStore.setActiveConnection(conn.id)
              uiStore.addTab({
                id: `server-${conn.id}`,
                title: `${conn.name} - Server`,
                type: 'server',
                connectionId: conn.id
              })
            }
          },
          {
            label: 'CLI',
            action: () => {
              connectionStore.setActiveConnection(conn.id)
              uiStore.addTab({
                id: `cli-${conn.id}`,
                title: `${conn.name} - CLI`,
                type: 'cli',
                connectionId: conn.id
              })
            }
          },
          {
            label: 'Monitor',
            action: () => {
              connectionStore.setActiveConnection(conn.id)
              uiStore.addTab({
                id: `monitor-${conn.id}`,
                title: `${conn.name} - Monitor`,
                type: 'monitor',
                connectionId: conn.id
              })
            }
          },
          {
            label: 'Pub/Sub',
            action: () => {
              connectionStore.setActiveConnection(conn.id)
              uiStore.addTab({
                id: `pubsub-${conn.id}`,
                title: `${conn.name} - Pub/Sub`,
                type: 'pubsub',
                connectionId: conn.id
              })
            }
          },
          {
            label: 'Cluster',
            action: () => {
              connectionStore.setActiveConnection(conn.id)
              uiStore.addTab({
                id: `cluster-${conn.id}`,
                title: `${conn.name} - Cluster`,
                type: 'cluster',
                connectionId: conn.id
              })
            }
          }
        ]
      : []),
    { label: '', action: () => {}, separator: true },
    {
      label: conn.group ? `Group: ${conn.group}` : 'Set Group...',
      action: async () => {
        const group = prompt('Enter group name (leave empty to remove):', conn.group || '')
        if (group !== null) {
          const updated = { ...conn, group: group.trim() || '', updatedAt: Date.now() }
          await connectionStore.saveConnection(updated)
        }
      }
    },
    ...(conn.group
      ? [
          {
            label: 'Remove from Group',
            action: async () => {
              const updated = { ...conn, group: '', updatedAt: Date.now() }
              await connectionStore.saveConnection(updated)
            }
          }
        ]
      : []),
    { label: '', action: () => {}, separator: true },
    {
      label: 'Edit',
      action: () => {
        editingConnection.value = conn
        showConnectionForm.value = true
      }
    },
    {
      label: 'Delete',
      danger: true,
      action: async () => {
        if (confirm(`Delete connection "${conn.name}"?`)) {
          await connectionStore.deleteConnection(conn.id)
          uiStore.removeTabsByConnection(conn.id)
        }
      }
    }
  ])
}

function handleContextMenuSelect(item: { action?: () => void }) {
  if (item.action) item.action()
  uiStore.hideContextMenu()
}

// --- Connection form ---
function handleAddConnection() {
  editingConnection.value = null
  showConnectionForm.value = true
}

async function handleSaveConnection(config: ConnectionConfig) {
  try {
    await connectionStore.saveConnection(config)
    showConnectionForm.value = false
    editingConnection.value = null
  } catch {
    // Error in store
  }
}

async function handleTestConnection(config: ConnectionConfig) {
  const result = await connectionStore.testConnection(config)
  formRef.value?.setTestResult(result)
}

// --- Tab actions ---
function handleTabSelect(tabId: string) {
  uiStore.setActiveTab(tabId)
  const tab = uiStore.tabs.find((t) => t.id === tabId)
  if (tab?.connectionId) {
    connectionStore.setActiveConnection(tab.connectionId)
  }
}

function handleTabClose(tabId: string) {
  uiStore.removeTab(tabId)
}

function handleTabAdd() {
  uiStore.addTab({
    id: 'settings',
    title: 'Settings',
    type: 'settings',
    connectionId: ''
  })
}

function handleOpenSettings() {
  uiStore.addTab({
    id: 'settings',
    title: 'Settings',
    type: 'settings',
    connectionId: ''
  })
}

// --- Sidebar resize ---
function onSidebarDragStart(e: MouseEvent) {
  isDraggingSidebar.value = true
  startX.value = e.clientX
  startWidth.value = sidebarWidth.value
  document.addEventListener('mousemove', onSidebarDragMove)
  document.addEventListener('mouseup', onSidebarDragEnd)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onSidebarDragMove(e: MouseEvent) {
  if (!isDraggingSidebar.value) return
  const delta = e.clientX - startX.value
  sidebarWidth.value = Math.max(180, Math.min(500, startWidth.value + delta))
}

function onSidebarDragEnd() {
  isDraggingSidebar.value = false
  document.removeEventListener('mousemove', onSidebarDragMove)
  document.removeEventListener('mouseup', onSidebarDragEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <div id="app-root" class="h-screen w-screen overflow-hidden flex flex-col bg-base">
      <!-- Title Bar -->
      <AppTitleBar />

      <!-- Main Area: Sidebar + Content -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar -->
        <AppSidebar
          :width="sidebarWidth"
          @add-connection="handleAddConnection"
          @context-menu="handleContextMenu"
          @connection-click="handleConnectionClick"
          @connection-connect="handleConnectionConnect"
          @connection-disconnect="handleConnectionDisconnect"
        />

        <!-- Sidebar resize handle -->
        <div
          class="relative z-10 w-0 cursor-col-resize group/resize"
          @mousedown="onSidebarDragStart"
          @mouseenter="isSidebarHoverHandle = true"
          @mouseleave="isSidebarHoverHandle = false"
        >
          <div
            class="absolute -left-[1px] top-0 h-full w-[2px] transition-all duration-200"
            :class="[
              isDraggingSidebar
                ? 'bg-accent w-[2px]'
                : isSidebarHoverHandle
                  ? 'bg-accent/50 w-[2px]'
                  : 'bg-transparent'
            ]"
          />
        </div>

        <!-- Content Area -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <!-- Tab Bar (only when tabs exist) -->
          <TabBar
            v-if="uiStore.hasOpenTabs"
            :tabs="uiStore.tabs"
            :active-tab-id="uiStore.activeTab"
            @tab-select="handleTabSelect"
            @tab-close="handleTabClose"
            @tab-add="handleTabAdd"
          />

          <!-- Tab Content -->
          <div class="flex-1 overflow-hidden">
            <!-- Active tab content -->
            <template v-if="activeTabData">
              <KeyBrowser
                v-if="activeTabData.type === 'keys'"
                :connection-id="activeTabData.connectionId"
              />
              <ServerInfo
                v-else-if="activeTabData.type === 'server'"
                :connection-id="activeTabData.connectionId"
              />
              <CLIPanel
                v-else-if="activeTabData.type === 'cli'"
                :connection-id="activeTabData.connectionId"
              />
              <MonitorPanel
                v-else-if="activeTabData.type === 'monitor'"
                :connection-id="activeTabData.connectionId"
              />
              <PubSubPanel
                v-else-if="activeTabData.type === 'pubsub'"
                :connection-id="activeTabData.connectionId"
              />
              <ClusterOverview
                v-else-if="activeTabData.type === 'cluster'"
                :connection-id="activeTabData.connectionId"
              />
              <SettingsPanel
                v-else-if="activeTabData.type === 'settings'"
              />
            </template>

            <!-- Welcome screen when no tabs -->
            <div
              v-else
              class="flex h-full flex-col items-center justify-center bg-base"
            >
              <div class="flex max-w-sm flex-col items-center gap-6 px-6">
                <!-- Logo -->
                <div class="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-accent-subtle">
                  <div class="absolute inset-0 rounded-2xl bg-accent/5 animate-pulse-glow" />
                  <Database class="w-10 h-10 text-accent" :stroke-width="1.5" />
                </div>

                <!-- Title and description -->
                <div class="text-center space-y-2">
                  <h1 class="text-xl font-bold text-text">Redis Manager</h1>
                  <p class="text-md text-text-muted leading-relaxed">
                    Connect to your Redis servers to browse keys, run commands, and monitor performance.
                  </p>
                </div>

                <!-- New Connection button -->
                <button
                  class="btn-primary gap-2.5 px-6 py-2.5"
                  @click="handleAddConnection"
                >
                  <Plus class="w-4 h-4" :stroke-width="2.5" />
                  New Connection
                </button>

                <!-- Keyboard shortcut hint -->
                <p class="text-xs text-text-faint">
                  Press
                  <kbd class="px-1.5 py-0.5 rounded border border-border bg-surface-0 text-xs font-mono text-text-muted mx-0.5">Ctrl+N</kbd>
                  to quickly add a connection
                </p>
              </div>
            </div>
          </div>

          <!-- Status Bar -->
          <StatusBar @open-settings="handleOpenSettings" />
        </div>
      </div>

      <!-- Connection Form Modal -->
      <ConnectionForm
        ref="formRef"
        :connection="editingConnection"
        :visible="showConnectionForm"
        @save="handleSaveConnection"
        @cancel="showConnectionForm = false; editingConnection = null"
        @test="handleTestConnection"
      />

      <!-- Connect/Disconnect Confirm Dialog -->
      <ConfirmDialog
        :visible="confirmDialog.visible"
        :title="confirmDialog.title"
        :message="confirmDialog.message"
        :confirm-text="confirmDialog.confirmText"
        :variant="confirmDialog.variant"
        @confirm="handleConfirmDialogConfirm"
        @cancel="handleConfirmDialogCancel"
      />

      <!-- Context Menu -->
      <ContextMenu
        v-if="uiStore.contextMenu?.visible"
        :visible="true"
        :x="uiStore.contextMenu.x"
        :y="uiStore.contextMenu.y"
        :items="uiStore.contextMenu.items"
        @close="uiStore.hideContextMenu()"
        @select="handleContextMenuSelect"
      />
    </div>
  </TooltipProvider>
</template>
