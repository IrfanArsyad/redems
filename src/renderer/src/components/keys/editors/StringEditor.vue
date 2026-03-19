<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Copy, Save } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
  keyName: string
  value: string
}>()

type ViewTab = 'text' | 'json' | 'hex'

const activeTab = ref<ViewTab>('text')
const editValue = ref<string>(props.value ?? '')
const isModified = ref(false)
const saving = ref(false)
const ttlInput = ref<string>('')

const byteCount = computed(() => {
  return new TextEncoder().encode(editValue.value).length
})

const isValidJson = computed(() => {
  try {
    JSON.parse(editValue.value)
    return true
  } catch {
    return false
  }
})

const formattedJson = computed(() => {
  if (!isValidJson.value) return editValue.value
  try {
    return JSON.stringify(JSON.parse(editValue.value), null, 2)
  } catch {
    return editValue.value
  }
})

const hexView = computed(() => {
  const bytes = new TextEncoder().encode(editValue.value)
  const lines: string[] = []
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16)
    const hex = Array.from(chunk)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')
    const ascii = Array.from(chunk)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('')
    const offset = i.toString(16).padStart(8, '0')
    lines.push(`${offset}  ${hex.padEnd(48)}  ${ascii}`)
  }
  return lines.join('\n')
})

const lineNumbers = computed(() => {
  const text = activeTab.value === 'json' ? formattedJson.value : editValue.value
  const count = (text.match(/\n/g) || []).length + 1
  return Array.from({ length: count }, (_, i) => i + 1)
})

watch(
  () => props.value,
  (newVal) => {
    editValue.value = newVal ?? ''
    isModified.value = false
  }
)

function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  editValue.value = target.value
  isModified.value = editValue.value !== (props.value ?? '')
}

function onJsonInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  editValue.value = target.value
  isModified.value = true
}

function formatJson(): void {
  if (isValidJson.value) {
    editValue.value = JSON.stringify(JSON.parse(editValue.value), null, 2)
    isModified.value = editValue.value !== (props.value ?? '')
  }
}

function minifyJson(): void {
  if (isValidJson.value) {
    editValue.value = JSON.stringify(JSON.parse(editValue.value))
    isModified.value = editValue.value !== (props.value ?? '')
  }
}

async function onSave(): Promise<void> {
  saving.value = true
  try {
    const ttl = ttlInput.value ? parseInt(ttlInput.value) : undefined
    await window.api.invoke(
      'string:set',
      props.connectionId,
      props.keyName,
      editValue.value,
      ttl && ttl > 0 ? ttl : undefined
    )
    isModified.value = false
  } catch (err) {
    console.error('Failed to save string value:', err)
  } finally {
    saving.value = false
  }
}

function onCopyValue(): void {
  navigator.clipboard.writeText(editValue.value)
}

function switchTab(tab: ViewTab): void {
  if (tab === 'json' && isValidJson.value) {
    editValue.value = formattedJson.value
  }
  activeTab.value = tab
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Tab bar + actions -->
    <div class="flex items-center justify-between px-3 py-1.5 bg-surface-0 border-b border-border flex-shrink-0">
      <div class="flex items-center gap-0.5">
        <button
          v-for="tab in (['text', 'json', 'hex'] as ViewTab[])"
          :key="tab"
          class="px-3 py-1 text-xs rounded-md transition-all duration-150 capitalize font-medium"
          :class="{
            'bg-accent-muted text-accent': activeTab === tab,
            'text-text-muted hover:text-text hover:bg-overlay-0/40': activeTab !== tab,
            'opacity-40 cursor-not-allowed': tab === 'json' && !isValidJson
          }"
          :disabled="tab === 'json' && !isValidJson"
          @click="switchTab(tab)"
        >
          {{ tab }}
        </button>
      </div>

      <div class="flex items-center gap-2">
        <!-- Byte count -->
        <span class="text-xs text-text-faint tabular-nums">{{ byteCount.toLocaleString() }} bytes</span>

        <!-- JSON format/minify buttons -->
        <template v-if="activeTab === 'json' && isValidJson">
          <button
            class="text-xs text-accent hover:text-accent-hover transition-colors px-2 py-0.5 rounded hover:bg-accent-subtle font-medium"
            @click="formatJson"
          >
            Format
          </button>
          <button
            class="text-xs text-accent hover:text-accent-hover transition-colors px-2 py-0.5 rounded hover:bg-accent-subtle font-medium"
            @click="minifyJson"
          >
            Minify
          </button>
        </template>

        <!-- Copy -->
        <button
          class="btn-icon-sm !w-6 !h-6"
          title="Copy Value"
          @click="onCopyValue"
        >
          <Copy class="w-3.5 h-3.5" :stroke-width="1.75" />
        </button>

        <!-- Unsaved indicator -->
        <span
          v-if="isModified"
          class="w-2 h-2 rounded-full bg-warning flex-shrink-0"
          title="Unsaved changes"
        />
      </div>
    </div>

    <!-- Editor area -->
    <div class="flex-1 min-h-0 relative">
      <!-- Text / JSON editor -->
      <div
        v-if="activeTab !== 'hex'"
        class="flex h-full"
      >
        <!-- Line numbers -->
        <div class="flex flex-col items-end py-2 px-2.5 bg-mantle border-r border-border text-xxs text-text-faint font-mono select-none flex-shrink-0 overflow-hidden tabular-nums">
          <div v-for="num in lineNumbers" :key="num" class="leading-5">
            {{ num }}
          </div>
        </div>

        <!-- Textarea -->
        <textarea
          :value="activeTab === 'json' ? formattedJson : editValue"
          class="flex-1 w-full resize-none p-3 bg-base text-text text-xs font-mono leading-5 focus:outline-none scrollbar-thin"
          spellcheck="false"
          wrap="off"
          @input="activeTab === 'json' ? onJsonInput($event) : onInput($event)"
        />
      </div>

      <!-- Hex view (read-only) -->
      <div
        v-else
        class="h-full overflow-auto p-4 scrollbar-thin bg-mantle"
      >
        <pre class="text-xs font-mono text-text-secondary whitespace-pre leading-5">{{ hexView }}</pre>
      </div>
    </div>

    <!-- Save bar -->
    <div class="flex items-center gap-3 px-3 py-2 bg-surface-0 border-t border-border flex-shrink-0">
      <div class="flex items-center gap-2">
        <label class="text-xs text-text-faint font-medium">TTL:</label>
        <input
          v-model="ttlInput"
          type="number"
          placeholder="seconds"
          class="input-sm !w-24 !h-6 !text-xs"
          min="0"
        />
      </div>
      <div class="flex-1" />
      <button
        class="h-7 px-4 text-xs rounded-md font-medium transition-all duration-200 flex items-center gap-1.5"
        :class="{
          'btn-primary !h-7': isModified,
          'bg-overlay-0/50 text-text-faint cursor-not-allowed': !isModified
        }"
        :disabled="!isModified || saving"
        @click="onSave"
      >
        <Save class="w-3.5 h-3.5" :stroke-width="2" />
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
    </div>
  </div>
</template>
