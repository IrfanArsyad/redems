import { ref, onUnmounted } from 'vue'

export interface ContextMenuItem {
  label: string
  icon?: string
  shortcut?: string
  action?: () => void
  separator?: boolean
  disabled?: boolean
  danger?: boolean
}

export function useContextMenu() {
  const visible = ref(false)
  const x = ref(0)
  const y = ref(0)
  const items = ref<ContextMenuItem[]>([])

  function show(event: MouseEvent, menuItems: ContextMenuItem[]): void {
    event.preventDefault()
    event.stopPropagation()

    items.value = menuItems
    x.value = event.clientX
    y.value = event.clientY
    visible.value = true

    // Close on next click anywhere
    setTimeout(() => {
      document.addEventListener('click', close, { once: true })
      document.addEventListener('contextmenu', close, { once: true })
    }, 0)
  }

  function close(): void {
    visible.value = false
    items.value = []
  }

  function select(item: ContextMenuItem): void {
    if (!item.disabled && !item.separator && item.action) {
      item.action()
    }
    close()
  }

  onUnmounted(() => {
    document.removeEventListener('click', close)
    document.removeEventListener('contextmenu', close)
  })

  return {
    visible,
    x,
    y,
    items,
    show,
    close,
    select
  }
}
