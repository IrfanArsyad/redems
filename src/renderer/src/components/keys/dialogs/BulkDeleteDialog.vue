<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, AlertTriangle } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  count: number
  pattern?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmText = ref('')

const isConfirmed = computed(() => confirmText.value === 'DELETE')

function onConfirm(): void {
  if (!isConfirmed.value) return
  emit('confirm')
}

function onCancel(): void {
  confirmText.value = ''
  emit('cancel')
}

function onOverlayClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    onCancel()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click="onOverlayClick"
    >
      <div class="w-[420px] bg-surface-0 border border-danger/30 rounded-xl shadow-xl" @click.stop>
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-border bg-danger/5">
          <div class="flex items-center gap-2">
            <AlertTriangle class="w-5 h-5 text-danger" :stroke-width="2" />
            <h2 class="text-md font-semibold text-danger">Delete Keys</h2>
          </div>
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-overlay-0 text-text-muted hover:text-text transition-colors"
            @click="onCancel"
          >
            <X class="w-4 h-4" :stroke-width="2" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-5 py-4 space-y-4">
          <div class="text-xs text-text leading-relaxed">
            You are about to permanently delete
            <span class="font-semibold text-danger">{{ count }}</span>
            key{{ count !== 1 ? 's' : '' }}.
            <template v-if="pattern">
              <br />Pattern: <code class="px-1 py-0.5 bg-overlay-0 rounded font-mono text-accent">{{ pattern }}</code>
            </template>
          </div>

          <div class="p-3 bg-danger/5 border border-danger/20 rounded text-xs text-danger leading-relaxed">
            This action cannot be undone. The selected keys and their data will be permanently removed from the database.
          </div>

          <div>
            <label class="block text-xs text-text-muted mb-1.5">
              Type <span class="font-mono font-semibold text-text">DELETE</span> to confirm
            </label>
            <input
              v-model="confirmText"
              type="text"
              placeholder="DELETE"
              class="w-full h-8 px-3 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-danger font-mono"
              @keydown.enter="onConfirm"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <button
            class="h-8 px-4 text-xs rounded font-medium bg-overlay-0 text-text hover:bg-border transition-colors"
            @click="onCancel"
          >
            Cancel
          </button>
          <button
            class="h-8 px-4 text-xs rounded font-medium transition-colors"
            :class="{
              'bg-danger text-white hover:bg-danger/90': isConfirmed,
              'bg-overlay-0 text-text-muted cursor-not-allowed': !isConfirmed
            }"
            :disabled="!isConfirmed"
            @click="onConfirm"
          >
            Delete {{ count }} Key{{ count !== 1 ? 's' : '' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
