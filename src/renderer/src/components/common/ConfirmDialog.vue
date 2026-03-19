<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Modal from './Modal.vue'
import { AlertTriangle } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'danger'
    requireTyping?: string
  }>(),
  {
    title: 'Confirm',
    message: 'Are you sure?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default',
    requireTyping: ''
  }
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const typedValue = ref('')

const canConfirm = computed(() => {
  if (props.requireTyping) {
    return typedValue.value === props.requireTyping
  }
  return true
})

const isDanger = computed(() => props.variant === 'danger')

// Reset typed value when dialog opens/closes
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      typedValue.value = ''
    }
  }
)

function onClose(): void {
  emit('cancel')
}

function onConfirm(): void {
  if (!canConfirm.value) return
  emit('confirm')
}
</script>

<template>
  <Modal
    :visible="visible"
    :title="title"
    width="420px"
    :closable="true"
    @close="onClose"
  >
    <div class="flex flex-col gap-4">
      <!-- Warning icon for danger variant -->
      <div v-if="isDanger" class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-danger/10 shrink-0">
          <AlertTriangle class="w-5 h-5 text-danger" :stroke-width="2" />
        </div>
        <p class="text-md text-text">{{ message }}</p>
      </div>

      <p v-else class="text-md text-text">{{ message }}</p>

      <!-- Typing confirmation -->
      <div v-if="requireTyping" class="flex flex-col gap-2">
        <p class="text-xs text-text-muted">
          Please type <code class="px-1 py-0.5 bg-overlay-0 rounded text-accent text-xs font-mono">{{ requireTyping }}</code> to confirm:
        </p>
        <input
          v-model="typedValue"
          type="text"
          class="w-full h-8 px-3 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
          :placeholder="requireTyping"
          @keydown.enter="onConfirm"
        />
      </div>
    </div>

    <template #footer>
      <button
        class="px-4 py-1.5 text-xs bg-overlay-0 hover:bg-border text-text rounded transition-colors duration-150"
        @click="onClose"
      >
        {{ cancelText }}
      </button>
      <button
        class="px-4 py-1.5 text-xs rounded transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        :class="[
          isDanger
            ? 'bg-danger hover:bg-danger/80 text-white'
            : 'bg-accent hover:bg-accent-hover text-white'
        ]"
        :disabled="!canConfirm"
        @click="onConfirm"
      >
        {{ confirmText }}
      </button>
    </template>
  </Modal>
</template>
