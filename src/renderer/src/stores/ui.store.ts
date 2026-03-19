import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Tab {
  id: string
  title: string
  type: string
  connectionId: string
  icon?: string
}

export interface ContextMenuItem {
  label: string
  action: () => void
  icon?: string
  separator?: boolean
  disabled?: boolean
  danger?: boolean
}

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}

export const useUiStore = defineStore('ui', () => {
  // State
  const sidebarWidth = ref<number>(260)
  const bottomPanelHeight = ref<number>(200)
  const bottomPanelVisible = ref<boolean>(false)
  const activeTab = ref<string | null>(null)
  const tabs = ref<Tab[]>([])
  const contextMenu = ref<ContextMenuState | null>(null)

  // Getters
  const activeTabData = computed<Tab | undefined>(() => {
    if (!activeTab.value) return undefined
    return tabs.value.find((t) => t.id === activeTab.value)
  })

  const tabCount = computed<number>(() => tabs.value.length)

  const hasOpenTabs = computed<boolean>(() => tabs.value.length > 0)

  // Actions
  function addTab(tab: Tab): void {
    const existing = tabs.value.find((t) => t.id === tab.id)
    if (existing) {
      // Tab already exists, just activate it
      activeTab.value = tab.id
      return
    }
    tabs.value.push(tab)
    activeTab.value = tab.id
  }

  function removeTab(tabId: string): void {
    const index = tabs.value.findIndex((t) => t.id === tabId)
    if (index === -1) return

    tabs.value.splice(index, 1)

    // If we removed the active tab, activate an adjacent one
    if (activeTab.value === tabId) {
      if (tabs.value.length === 0) {
        activeTab.value = null
      } else if (index >= tabs.value.length) {
        activeTab.value = tabs.value[tabs.value.length - 1].id
      } else {
        activeTab.value = tabs.value[index].id
      }
    }
  }

  function removeTabsByConnection(connectionId: string): void {
    const tabsToRemove = tabs.value.filter((t) => t.connectionId === connectionId)
    tabsToRemove.forEach((t) => removeTab(t.id))
  }

  function removeAllTabs(): void {
    tabs.value = []
    activeTab.value = null
  }

  function setActiveTab(tabId: string | null): void {
    activeTab.value = tabId
  }

  function toggleBottomPanel(): void {
    bottomPanelVisible.value = !bottomPanelVisible.value
  }

  function showBottomPanel(): void {
    bottomPanelVisible.value = true
  }

  function hideBottomPanel(): void {
    bottomPanelVisible.value = false
  }

  function setSidebarWidth(width: number): void {
    sidebarWidth.value = Math.max(180, Math.min(500, width))
  }

  function setBottomPanelHeight(height: number): void {
    bottomPanelHeight.value = Math.max(100, Math.min(600, height))
  }

  function showContextMenu(x: number, y: number, items: ContextMenuItem[]): void {
    contextMenu.value = { visible: true, x, y, items }
  }

  function hideContextMenu(): void {
    contextMenu.value = null
  }

  function updateTabTitle(tabId: string, title: string): void {
    const tab = tabs.value.find((t) => t.id === tabId)
    if (tab) {
      tab.title = title
    }
  }

  return {
    // State
    sidebarWidth,
    bottomPanelHeight,
    bottomPanelVisible,
    activeTab,
    tabs,
    contextMenu,

    // Getters
    activeTabData,
    tabCount,
    hasOpenTabs,

    // Actions
    addTab,
    removeTab,
    removeTabsByConnection,
    removeAllTabs,
    setActiveTab,
    toggleBottomPanel,
    showBottomPanel,
    hideBottomPanel,
    setSidebarWidth,
    setBottomPanelHeight,
    showContextMenu,
    hideContextMenu,
    updateTabTitle
  }
})
