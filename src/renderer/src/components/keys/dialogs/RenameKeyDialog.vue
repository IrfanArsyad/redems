<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  currentName: string
}>()

const emit = defineEmits<{
  rename: [newName: string]
  cancel: []
}>()

const newName = ref(props.currentName)

watch(
  () => props.currentName,
  (val) => {
    newName.value = val
  }
)

function onRename(): void {
  const trimmed = newName.value.trim()
  if (!trimmed || trimmed === props.currentName) return
  emit('rename', trimmed)
}

function onCancel(): void {
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
      <div class="w-[420px] bg-surface-0 border border-border rounded-xl shadow-xl" @click.stop>
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 class="text-md font-semibold text-text">Rename Key</h2>
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-overlay-0 text-text-muted hover:text-text transition-colors"
            @click="onCancel"
          >
            <X class="w-4 h-4" :stroke-width="2" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-5 py-4 space-y-3">
          <div>
            <label class="block text-xs text-text-muted mb-1.5">Current Name</label>
            <div class="px-3 py-2 text-xs font-mono text-text-secondary bg-overlay-0/50 rounded border border-border truncate">
              {{ currentName }}
            </div>
          </div>

          <div>
            <label class="block text-xs text-text-muted mb-1.5">New Name</label>
            <input
              v-model="newName"
              type="text"
              class="input-sm font-mono"
              autofocus
              @keydown.enter="onRename"
              @keydown.escape="onCancel"
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
              'bg-accent text-white hover:bg-accent-hover': newName.trim() && newName.trim() !== currentName,
              'bg-overlay-0 text-text-muted cursor-not-allowed': !newName.trim() || newName.trim() === currentName
            }"
            :disabled="!newName.trim() || newName.trim() === currentName"
            @click="onRename"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
