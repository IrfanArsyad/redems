<script setup lang="ts">
import { ref, onUnmounted, provide, readonly } from 'vue'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

export interface ToastItem {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration: number
  createdAt: number
}

export interface ToastApi {
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  remove: (id: number) => void
}

const MAX_TOASTS = 5
let nextId = 0
const toasts = ref<ToastItem[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()

function addToast(type: ToastItem['type'], message: string, duration: number = 4000): void {
  const id = nextId++
  const toast: ToastItem = {
    id,
    type,
    message,
    duration,
    createdAt: Date.now()
  }

  toasts.value.push(toast)

  while (toasts.value.length > MAX_TOASTS) {
    const oldest = toasts.value.shift()
    if (oldest) {
      clearTimer(oldest.id)
    }
  }

  if (duration > 0) {
    const timer = setTimeout(() => {
      removeToast(id)
    }, duration)
    timers.set(id, timer)
  }
}

function removeToast(id: number): void {
  const index = toasts.value.findIndex((t) => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
  clearTimer(id)
}

function clearTimer(id: number): void {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

const toastApi: ToastApi = {
  success: (message, duration) => addToast('success', message, duration),
  error: (message, duration) => addToast('error', message, duration),
  warning: (message, duration) => addToast('warning', message, duration),
  info: (message, duration) => addToast('info', message, duration),
  remove: removeToast
}

provide('toast', toastApi)
provide('toasts', readonly(toasts))

defineExpose({ toast: toastApi })

onUnmounted(() => {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
})

function iconBgClass(type: ToastItem['type']): string {
  switch (type) {
    case 'success':
      return 'bg-success-muted text-success'
    case 'error':
      return 'bg-danger-muted text-danger'
    case 'warning':
      return 'bg-warning-muted text-warning'
    case 'info':
      return 'bg-info-muted text-info'
  }
}

function progressColor(type: ToastItem['type']): string {
  switch (type) {
    case 'success':
      return 'bg-success'
    case 'error':
      return 'bg-danger'
    case 'warning':
      return 'bg-warning'
    case 'info':
      return 'bg-info'
  }
}
</script>

<template>
  <slot />

  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto relative flex items-start gap-3 w-80 px-4 py-3 bg-surface-1 border border-border rounded-xl shadow-lg overflow-hidden"
        >
          <!-- Icon -->
          <div class="flex items-center justify-center w-6 h-6 rounded-lg shrink-0" :class="iconBgClass(toast.type)">
            <CheckCircle2 v-if="toast.type === 'success'" class="w-3.5 h-3.5" :stroke-width="2.5" />
            <XCircle v-else-if="toast.type === 'error'" class="w-3.5 h-3.5" :stroke-width="2.5" />
            <AlertTriangle v-else-if="toast.type === 'warning'" class="w-3.5 h-3.5" :stroke-width="2.5" />
            <Info v-else class="w-3.5 h-3.5" :stroke-width="2.5" />
          </div>

          <!-- Message -->
          <span class="flex-1 text-xs text-text leading-relaxed pt-0.5">{{ toast.message }}</span>

          <!-- Close button -->
          <button
            class="btn-icon-sm !w-5 !h-5 shrink-0"
            @click="removeToast(toast.id)"
          >
            <X class="w-3 h-3" :stroke-width="2" />
          </button>

          <!-- Progress bar -->
          <div
            v-if="toast.duration > 0"
            class="absolute bottom-0 left-0 h-[2px] rounded-full"
            :class="progressColor(toast.type)"
            :style="{
              animation: `toast-progress ${toast.duration}ms linear forwards`
            }"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
