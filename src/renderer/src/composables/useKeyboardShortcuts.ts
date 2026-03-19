import { onMounted, onUnmounted } from 'vue'

export interface ShortcutBinding {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description?: string
}

const globalBindings: ShortcutBinding[] = []

function handleKeyDown(event: KeyboardEvent): void {
  for (const binding of globalBindings) {
    const ctrlMatch = binding.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
    const shiftMatch = binding.shift ? event.shiftKey : !event.shiftKey
    const altMatch = binding.alt ? event.altKey : !event.altKey
    const keyMatch = event.key.toLowerCase() === binding.key.toLowerCase()

    if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
      event.preventDefault()
      event.stopPropagation()
      binding.action()
      return
    }
  }
}

export function useKeyboardShortcuts(bindings: ShortcutBinding[]) {
  onMounted(() => {
    globalBindings.push(...bindings)
    if (globalBindings.length === bindings.length) {
      document.addEventListener('keydown', handleKeyDown)
    }
  })

  onUnmounted(() => {
    for (const binding of bindings) {
      const idx = globalBindings.indexOf(binding)
      if (idx !== -1) globalBindings.splice(idx, 1)
    }
    if (globalBindings.length === 0) {
      document.removeEventListener('keydown', handleKeyDown)
    }
  })

  return { bindings }
}

export function useGlobalShortcuts(shortcuts: {
  newConnection?: () => void
  closeTab?: () => void
  search?: () => void
  toggleCli?: () => void
  refresh?: () => void
  deleteKey?: () => void
  renameKey?: () => void
  settings?: () => void
}) {
  const bindings: ShortcutBinding[] = []

  if (shortcuts.newConnection) {
    bindings.push({ key: 'n', ctrl: true, action: shortcuts.newConnection, description: 'New Connection' })
  }
  if (shortcuts.closeTab) {
    bindings.push({ key: 'w', ctrl: true, action: shortcuts.closeTab, description: 'Close Tab' })
  }
  if (shortcuts.search) {
    bindings.push({ key: 'f', ctrl: true, action: shortcuts.search, description: 'Search' })
  }
  if (shortcuts.toggleCli) {
    bindings.push({ key: '`', ctrl: true, action: shortcuts.toggleCli, description: 'Toggle CLI' })
  }
  if (shortcuts.refresh) {
    bindings.push({ key: 'F5', action: shortcuts.refresh, description: 'Refresh' })
  }
  if (shortcuts.deleteKey) {
    bindings.push({ key: 'Delete', action: shortcuts.deleteKey, description: 'Delete Key' })
  }
  if (shortcuts.renameKey) {
    bindings.push({ key: 'F2', action: shortcuts.renameKey, description: 'Rename Key' })
  }
  if (shortcuts.settings) {
    bindings.push({ key: ',', ctrl: true, action: shortcuts.settings, description: 'Settings' })
  }

  return useKeyboardShortcuts(bindings)
}
