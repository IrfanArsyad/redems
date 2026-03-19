<script setup lang="ts">
import { watch, nextTick, ref } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    width?: string
    closable?: boolean
  }>(),
  {
    title: '',
    width: '480px',
    closable: true
  }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const contentRef = ref<HTMLElement | null>(null)

function onBackdropClick(): void {
  if (props.closable) {
    emit('close')
  }
}

function onEscapeKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.closable && props.visible) {
    emit('close')
  }
}

// Focus trap: focus first input on open
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      document.addEventListener('keydown', onEscapeKey)
      await nextTick()
      if (contentRef.value) {
        const focusable = contentRef.value.querySelector<HTMLElement>(
          'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable) {
          focusable.focus()
        }
      }
    } else {
      document.removeEventListener('keydown', onEscapeKey)
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="onBackdropClick"
        />

        <!-- Dialog -->
        <div
          ref="contentRef"
          class="relative bg-surface-0 border border-border rounded-lg shadow-2xl flex flex-col max-h-[85vh] z-10"
          :style="{ width: width, maxWidth: '90vw' }"
          @click.stop
        >
          <!-- Header -->
          <div
            v-if="title || closable"
            class="flex items-center justify-between px-5 py-3 border-b border-border shrink-0"
          >
            <h2 class="text-md font-semibold text-text">{{ title }}</h2>
            <button
              v-if="closable"
              class="flex items-center justify-center w-6 h-6 rounded hover:bg-overlay-0 text-text-muted hover:text-text transition-colors duration-100"
              @click="emit('close')"
              title="Close"
            >
              <X class="w-3.5 h-3.5" :stroke-width="1.5" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-5 py-4">
            <slot />
          </div>

          <!-- Footer -->
          <div
            v-if="$slots.footer"
            class="flex items-center justify-end gap-2 px-5 py-3 border-t border-border shrink-0"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

.modal-leave-to .relative {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>
