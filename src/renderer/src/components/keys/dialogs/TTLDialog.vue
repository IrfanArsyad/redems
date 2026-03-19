<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  currentTTL: number
}>()

const emit = defineEmits<{
  save: [ttl: number]
  persist: []
  cancel: []
}>()

const ttlInput = ref<string>(props.currentTTL > 0 ? String(props.currentTTL) : '')

watch(
  () => props.currentTTL,
  (val) => {
    ttlInput.value = val > 0 ? String(val) : ''
  }
)

const presets = [
  { label: '1 min', value: 60 },
  { label: '5 min', value: 300 },
  { label: '1 hour', value: 3600 },
  { label: '1 day', value: 86400 },
  { label: '7 days', value: 604800 },
  { label: '30 days', value: 2592000 }
]

const humanReadable = computed(() => {
  const seconds = parseInt(ttlInput.value)
  if (!seconds || isNaN(seconds) || seconds <= 0) return ''

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`)
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`)
  if (secs > 0) parts.push(`${secs} second${secs > 1 ? 's' : ''}`)

  return parts.join(', ')
})

const currentTTLDisplay = computed(() => {
  if (props.currentTTL === -1) return 'No Expiry (persistent)'
  if (props.currentTTL === -2) return 'Key does not exist'
  return `${props.currentTTL} seconds`
})

function selectPreset(value: number): void {
  ttlInput.value = String(value)
}

function onSave(): void {
  const ttl = parseInt(ttlInput.value)
  if (!ttl || isNaN(ttl) || ttl <= 0) return
  emit('save', ttl)
}

function onPersist(): void {
  emit('persist')
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
          <h2 class="text-md font-semibold text-text">Set TTL</h2>
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-overlay-0 text-text-muted hover:text-text transition-colors"
            @click="onCancel"
          >
            <X class="w-4 h-4" :stroke-width="2" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-5 py-4 space-y-4">
          <!-- Current TTL -->
          <div class="text-xs text-text-muted">
            Current TTL: <span class="text-text">{{ currentTTLDisplay }}</span>
          </div>

          <!-- TTL input -->
          <div>
            <label class="block text-xs text-text-muted mb-1.5">TTL (seconds)</label>
            <input
              v-model="ttlInput"
              type="number"
              placeholder="Enter seconds"
              min="1"
              class="input-sm"
              autofocus
              @keydown.enter="onSave"
            />
            <!-- Human-readable duration -->
            <div
              v-if="humanReadable"
              class="mt-1.5 text-xs text-accent"
            >
              {{ humanReadable }}
            </div>
          </div>

          <!-- Presets -->
          <div>
            <label class="block text-xs text-text-muted mb-1.5">Quick Presets</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="preset in presets"
                :key="preset.value"
                class="px-2.5 py-1 text-xs rounded border transition-colors"
                :class="{
                  'border-accent bg-accent-muted text-accent': ttlInput === String(preset.value),
                  'border-border text-text-muted hover:text-text hover:border-border-accent': ttlInput !== String(preset.value)
                }"
                @click="selectPreset(preset.value)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-5 py-3 border-t border-border">
          <button
            class="h-8 px-4 text-xs rounded font-medium bg-warning-muted text-warning hover:bg-warning/25 transition-colors"
            title="Remove TTL - key will never expire"
            @click="onPersist"
          >
            No Expiry (Persist)
          </button>

          <div class="flex items-center gap-2">
            <button
              class="h-8 px-4 text-xs rounded font-medium bg-overlay-0 text-text hover:bg-border transition-colors"
              @click="onCancel"
            >
              Cancel
            </button>
            <button
              class="h-8 px-4 text-xs rounded font-medium transition-colors"
              :class="{
                'bg-accent text-white hover:bg-accent-hover': ttlInput && parseInt(ttlInput) > 0,
                'bg-overlay-0 text-text-muted cursor-not-allowed': !ttlInput || parseInt(ttlInput) <= 0
              }"
              :disabled="!ttlInput || parseInt(ttlInput) <= 0"
              @click="onSave"
            >
              Set TTL
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
