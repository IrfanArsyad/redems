<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { X, Pin, PinOff } from 'lucide-vue-next'
import type { EditorEntry } from '@renderer/composables/useContentEditor'

const props = defineProps<{
  isOpen: boolean
  isPinned: boolean
  activeEntry: EditorEntry | null
  currentValues: Record<string, string>
  isDirty: boolean
  readonly?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: []
  togglePin: []
  updateField: [key: string, value: string]
}>()

function onKeydown(e: KeyboardEvent): void {
  if (!props.isOpen) return
  if (e.key === 'Escape') {
    emit('close')
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (!props.readonly && props.isDirty) {
      emit('save')
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="slide-panel">
    <div
      v-if="isOpen && activeEntry"
      class="absolute top-0 right-0 bottom-0 w-[380px] bg-surface-0 border-l border-border flex flex-col z-20 shadow-xl shadow-black/20"
    >
      <!-- Header -->
      <div class="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-mantle flex-shrink-0">
        <div class="flex-1 min-w-0 flex items-center gap-2">
          <span class="text-xs font-semibold text-text truncate">
            {{ activeEntry.label }}
          </span>
          <!-- Dirty indicator -->
          <span
            v-if="isDirty"
            class="w-2 h-2 rounded-full bg-warning flex-shrink-0"
            title="Unsaved changes"
          />
        </div>

        <!-- Pin button -->
        <button
          v-if="!readonly"
          class="btn-icon-sm !w-6 !h-6"
          :class="isPinned ? '!text-accent' : ''"
          :title="isPinned ? 'Unpin panel' : 'Pin panel (keep open after save)'"
          @click="$emit('togglePin')"
        >
          <Pin v-if="isPinned" class="w-3.5 h-3.5" :stroke-width="2" />
          <PinOff v-else class="w-3.5 h-3.5" :stroke-width="2" />
        </button>

        <!-- Close button -->
        <button
          class="btn-icon-sm !w-6 !h-6"
          title="Close (Esc)"
          @click="$emit('close')"
        >
          <X class="w-3.5 h-3.5" :stroke-width="2" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-auto scrollbar-thin p-3 space-y-3">
        <div
          v-for="field in activeEntry.fields"
          :key="field.key"
        >
          <label class="block text-xs font-medium text-text-muted mb-1.5">
            {{ field.label }}
          </label>

          <!-- Readonly text -->
          <div
            v-if="field.readonly"
            class="w-full px-2.5 py-2 rounded-md bg-mantle border border-border text-xs font-mono text-text-secondary break-all select-text"
          >
            {{ currentValues[field.key] }}
          </div>

          <!-- Number input -->
          <input
            v-else-if="field.type === 'number'"
            type="number"
            step="any"
            :value="currentValues[field.key]"
            class="input-sm !w-full font-mono"
            @input="$emit('updateField', field.key, ($event.target as HTMLInputElement).value)"
          />

          <!-- Textarea -->
          <textarea
            v-else-if="field.type === 'textarea'"
            :value="currentValues[field.key]"
            rows="8"
            class="w-full px-2.5 py-2 rounded-md border border-border bg-input-bg text-xs font-mono text-text resize-y focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-surface-0 outline-none transition-all scrollbar-thin"
            spellcheck="false"
            @input="$emit('updateField', field.key, ($event.target as HTMLTextAreaElement).value)"
          />

          <!-- Default text input -->
          <input
            v-else
            type="text"
            :value="currentValues[field.key]"
            class="input-sm !w-full font-mono"
            :readonly="field.readonly"
            @input="$emit('updateField', field.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- Footer -->
      <div
        v-if="!readonly"
        class="flex items-center gap-2 px-3 py-2.5 border-t border-border bg-mantle flex-shrink-0"
      >
        <span class="text-xxs text-text-faint">
          Ctrl+S to save
        </span>
        <div class="flex-1" />
        <button
          class="h-7 px-3 text-xs rounded-md font-medium bg-overlay-0 text-text-muted hover:text-text hover:bg-overlay-1 transition-colors"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          class="h-7 px-4 text-xs rounded-md font-medium transition-all"
          :class="{
            'bg-accent text-white hover:bg-accent-hover': isDirty,
            'bg-overlay-0 text-text-faint cursor-not-allowed': !isDirty
          }"
          :disabled="!isDirty"
          @click="$emit('save')"
        >
          Save
        </button>
      </div>

      <!-- Readonly footer -->
      <div
        v-else
        class="flex items-center justify-end px-3 py-2.5 border-t border-border bg-mantle flex-shrink-0"
      >
        <span class="text-xxs text-text-faint mr-auto">Read-only</span>
        <button
          class="h-7 px-3 text-xs rounded-md font-medium bg-overlay-0 text-text-muted hover:text-text hover:bg-overlay-1 transition-colors"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  transform: translateX(100%);
  opacity: 0.5;
}
</style>
