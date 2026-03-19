import { ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration: number
  timestamp: number
}

const notifications = ref<Notification[]>([])
let idCounter = 0

function addNotification(
  type: NotificationType,
  title: string,
  message?: string,
  duration = 4000
): void {
  const id = `notif-${++idCounter}`
  const notification: Notification = {
    id,
    type,
    title,
    message,
    duration,
    timestamp: Date.now()
  }

  notifications.value.push(notification)

  // Keep max 5
  if (notifications.value.length > 5) {
    notifications.value.shift()
  }

  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id)
    }, duration)
  }
}

function removeNotification(id: string): void {
  const idx = notifications.value.findIndex((n) => n.id === id)
  if (idx !== -1) {
    notifications.value.splice(idx, 1)
  }
}

function clearAll(): void {
  notifications.value = []
}

export function useNotification() {
  return {
    notifications,
    success: (title: string, message?: string, duration?: number) =>
      addNotification('success', title, message, duration),
    error: (title: string, message?: string, duration?: number) =>
      addNotification('error', title, message, duration ?? 6000),
    warning: (title: string, message?: string, duration?: number) =>
      addNotification('warning', title, message, duration),
    info: (title: string, message?: string, duration?: number) =>
      addNotification('info', title, message, duration),
    remove: removeNotification,
    clearAll
  }
}
