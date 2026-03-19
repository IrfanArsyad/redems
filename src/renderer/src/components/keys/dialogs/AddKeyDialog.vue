<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { RedisDataType } from '@shared/types/redis.types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  create: [key: string, type: string, value: unknown, ttl?: number]
  cancel: []
}>()

type KeyType = 'string' | 'hash' | 'list' | 'set' | 'zset' | 'stream'

const keyName = ref('')
const keyType = ref<KeyType>('string')
const ttlValue = ref<string>('')
const selectedPreset = ref<number | null>(null)

// Type-specific value inputs
const stringValue = ref('')
const hashField = ref('')
const hashValue = ref('')
const listValue = ref('')
const setMember = ref('')
const zsetMember = ref('')
const zsetScore = ref<string>('0')
const streamId = ref('*')
const streamField = ref('')
const streamFieldValue = ref('')

const ttlPresets = [
  { label: '60s', value: 60 },
  { label: '5m', value: 300 },
  { label: '1h', value: 3600 },
  { label: '1d', value: 86400 },
  { label: '7d', value: 604800 },
  { label: '30d', value: 2592000 }
]

const keyTypes: Array<{ label: string; value: KeyType }> = [
  { label: 'String', value: 'string' },
  { label: 'Hash', value: 'hash' },
  { label: 'List', value: 'list' },
  { label: 'Set', value: 'set' },
  { label: 'ZSet', value: 'zset' },
  { label: 'Stream', value: 'stream' }
]

const canCreate = computed(() => {
  if (!keyName.value.trim()) return false
  switch (keyType.value) {
    case 'string': return true // Empty string is valid
    case 'hash': return hashField.value.trim().length > 0
    case 'list': return listValue.value.trim().length > 0
    case 'set': return setMember.value.trim().length > 0
    case 'zset': return zsetMember.value.trim().length > 0
    case 'stream': return streamField.value.trim().length > 0
    default: return false
  }
})

function selectPreset(preset: number): void {
  selectedPreset.value = preset
  ttlValue.value = String(preset)
}

function buildValue(): unknown {
  switch (keyType.value) {
    case 'string':
      return stringValue.value
    case 'hash':
      return { [hashField.value]: hashValue.value }
    case 'list':
      return [listValue.value]
    case 'set':
      return [setMember.value]
    case 'zset':
      return [{ score: parseFloat(zsetScore.value) || 0, value: zsetMember.value }]
    case 'stream':
      return { [streamField.value]: streamFieldValue.value }
    default:
      return null
  }
}

function onCreate(): void {
  if (!canCreate.value) return
  const ttl = ttlValue.value ? parseInt(ttlValue.value) : undefined
  emit('create', keyName.value, keyType.value, buildValue(), ttl && ttl > 0 ? ttl : undefined)
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
      <div class="w-[480px] bg-surface-0 border border-border rounded-xl shadow-xl" @click.stop>
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 class="text-md font-semibold text-text">Add New Key</h2>
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-overlay-0 text-text-muted hover:text-text transition-colors"
            @click="onCancel"
          >
            <X class="w-4 h-4" :stroke-width="2" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-5 py-4 space-y-4">
          <!-- Key name -->
          <div>
            <label class="block text-xs text-text-muted mb-1.5">Key Name</label>
            <input
              v-model="keyName"
              type="text"
              placeholder="e.g. user:1001:profile"
              class="input-sm font-mono"
              autofocus
            />
          </div>

          <!-- Type selector -->
          <div>
            <label class="block text-xs text-text-muted mb-1.5">Type</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="t in keyTypes"
                :key="t.value"
                class="px-3 py-1.5 text-xs rounded border transition-colors"
                :class="{
                  'border-accent bg-accent-muted text-accent': keyType === t.value,
                  'border-border text-text-muted hover:text-text hover:border-border-accent': keyType !== t.value
                }"
                @click="keyType = t.value"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Value input (varies by type) -->
          <div>
            <label class="block text-xs text-text-muted mb-1.5">Initial Value</label>

            <!-- String -->
            <input
              v-if="keyType === 'string'"
              v-model="stringValue"
              type="text"
              placeholder="Value"
              class="input-sm font-mono"
            />

            <!-- Hash -->
            <div v-else-if="keyType === 'hash'" class="flex gap-2">
              <input
                v-model="hashField"
                type="text"
                placeholder="Field"
                class="input-sm flex-1 font-mono"
              />
              <input
                v-model="hashValue"
                type="text"
                placeholder="Value"
                class="input-sm flex-1 font-mono"
              />
            </div>

            <!-- List -->
            <input
              v-else-if="keyType === 'list'"
              v-model="listValue"
              type="text"
              placeholder="Value"
              class="input-sm font-mono"
            />

            <!-- Set -->
            <input
              v-else-if="keyType === 'set'"
              v-model="setMember"
              type="text"
              placeholder="Member"
              class="input-sm font-mono"
            />

            <!-- ZSet -->
            <div v-else-if="keyType === 'zset'" class="flex gap-2">
              <input
                v-model="zsetMember"
                type="text"
                placeholder="Member"
                class="input-sm flex-1 font-mono"
              />
              <input
                v-model="zsetScore"
                type="number"
                step="any"
                placeholder="Score"
                class="input-sm !w-28 font-mono"
              />
            </div>

            <!-- Stream -->
            <div v-else-if="keyType === 'stream'" class="space-y-2">
              <input
                v-model="streamId"
                type="text"
                placeholder="ID (* for auto)"
                class="input-sm font-mono"
              />
              <div class="flex gap-2">
                <input
                  v-model="streamField"
                  type="text"
                  placeholder="Field"
                  class="input-sm flex-1 font-mono"
                />
                <input
                  v-model="streamFieldValue"
                  type="text"
                  placeholder="Value"
                  class="input-sm flex-1 font-mono"
                />
              </div>
            </div>
          </div>

          <!-- TTL -->
          <div>
            <label class="block text-xs text-text-muted mb-1.5">TTL (optional)</label>
            <div class="flex items-center gap-2">
              <input
                v-model="ttlValue"
                type="number"
                placeholder="Seconds (empty = no expiry)"
                min="0"
                class="flex-1 h-8 px-3 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div class="flex flex-wrap gap-1.5 mt-2">
              <button
                v-for="preset in ttlPresets"
                :key="preset.value"
                class="px-2 py-1 text-xs rounded border transition-colors"
                :class="{
                  'border-accent bg-accent-muted text-accent': selectedPreset === preset.value,
                  'border-border text-text-muted hover:text-text': selectedPreset !== preset.value
                }"
                @click="selectPreset(preset.value)"
              >
                {{ preset.label }}
              </button>
            </div>
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
              'bg-accent text-white hover:bg-accent-hover': canCreate,
              'bg-overlay-0 text-text-muted cursor-not-allowed': !canCreate
            }"
            :disabled="!canCreate"
            @click="onCreate"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
