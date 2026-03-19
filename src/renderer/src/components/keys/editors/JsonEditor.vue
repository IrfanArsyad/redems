<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Copy, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  value: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  save: [value: string]
}>()

type ViewMode = 'tree' | 'raw'
const viewMode = ref<ViewMode>('tree')
const rawValue = ref(props.value)
const validationError = ref<string | null>(null)

watch(
  () => props.value,
  (newVal) => {
    rawValue.value = newVal
    validationError.value = null
  }
)

const parsedJson = computed(() => {
  try {
    return JSON.parse(props.value)
  } catch {
    return null
  }
})

const isValid = computed(() => {
  try {
    JSON.parse(rawValue.value)
    return true
  } catch {
    return false
  }
})

function formatJson(): void {
  try {
    const parsed = JSON.parse(rawValue.value)
    rawValue.value = JSON.stringify(parsed, null, 2)
    validationError.value = null
  } catch (e) {
    validationError.value = (e as Error).message
  }
}

function minifyJson(): void {
  try {
    const parsed = JSON.parse(rawValue.value)
    rawValue.value = JSON.stringify(parsed)
    validationError.value = null
  } catch (e) {
    validationError.value = (e as Error).message
  }
}

function onSave(): void {
  try {
    // Validate JSON before saving
    JSON.parse(rawValue.value)
    validationError.value = null
    emit('save', rawValue.value)
  } catch (e) {
    validationError.value = (e as Error).message
  }
}

function onCopy(): void {
  navigator.clipboard.writeText(rawValue.value)
}

function onInput(e: Event): void {
  rawValue.value = (e.target as HTMLTextAreaElement).value
  validationError.value = null
}

// JSON Tree node types
interface JsonTreeNode {
  key: string
  value: any
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  children?: JsonTreeNode[]
  expanded: boolean
}

const expandedPaths = ref<Set<string>>(new Set(['$']))

function getType(val: any): JsonTreeNode['type'] {
  if (val === null) return 'null'
  if (Array.isArray(val)) return 'array'
  return typeof val as JsonTreeNode['type']
}

function buildTreeNodes(obj: any, parentPath: string = '$'): JsonTreeNode[] {
  if (obj === null || typeof obj !== 'object') return []

  const entries = Array.isArray(obj)
    ? obj.map((val, idx) => [String(idx), val] as [string, any])
    : Object.entries(obj)

  return entries.map(([key, val]) => {
    const path = `${parentPath}.${key}`
    const type = getType(val)
    const isContainer = type === 'object' || type === 'array'
    return {
      key,
      value: val,
      type,
      children: isContainer ? buildTreeNodes(val, path) : undefined,
      expanded: expandedPaths.value.has(path)
    }
  })
}

const treeNodes = computed(() => {
  if (!parsedJson.value) return []
  return buildTreeNodes(parsedJson.value)
})

function toggleTreeNode(path: string): void {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path)
  } else {
    expandedPaths.value.add(path)
  }
}

function getValueColor(type: string): string {
  switch (type) {
    case 'string': return 'text-green-400'
    case 'number': return 'text-blue-400'
    case 'boolean': return 'text-orange-400'
    case 'null': return 'text-text-faint'
    default: return 'text-text'
  }
}

function formatValue(val: any, type: string): string {
  switch (type) {
    case 'string': return `"${val}"`
    case 'null': return 'null'
    default: return String(val)
  }
}

function getContainerLabel(node: JsonTreeNode): string {
  if (node.type === 'array') {
    const count = Array.isArray(node.value) ? node.value.length : 0
    return `Array[${count}]`
  }
  if (node.type === 'object') {
    const count = node.value ? Object.keys(node.value).length : 0
    return `Object{${count}}`
  }
  return ''
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-3 py-1.5 bg-surface-0 border-b border-border flex-shrink-0">
      <div class="flex items-center gap-1">
        <button
          class="px-3 py-1 text-xs rounded transition-colors"
          :class="{
            'bg-accent-muted text-accent': viewMode === 'tree',
            'text-text-muted hover:text-text hover:bg-overlay-0': viewMode !== 'tree'
          }"
          @click="viewMode = 'tree'"
        >
          Tree
        </button>
        <button
          class="px-3 py-1 text-xs rounded transition-colors"
          :class="{
            'bg-accent-muted text-accent': viewMode === 'raw',
            'text-text-muted hover:text-text hover:bg-overlay-0': viewMode !== 'raw'
          }"
          @click="viewMode = 'raw'"
        >
          Raw
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="text-xs text-accent hover:text-accent-hover transition-colors px-1.5 py-0.5 rounded-md hover:bg-accent-subtle"
          @click="formatJson"
        >
          Format
        </button>
        <button
          class="text-xs text-accent hover:text-accent-hover transition-colors px-1.5 py-0.5 rounded-md hover:bg-accent-subtle"
          @click="minifyJson"
        >
          Minify
        </button>
        <button
          class="btn-icon-sm"
          title="Copy JSON"
          @click="onCopy"
        >
          <Copy class="w-3.5 h-3.5" :stroke-width="2" />
        </button>
      </div>
    </div>

    <!-- Validation error -->
    <div
      v-if="validationError"
      class="px-3 py-1.5 bg-danger-muted border-b border-danger/20 text-xs text-danger flex-shrink-0"
    >
      JSON Error: {{ validationError }}
    </div>

    <!-- Tree view -->
    <div
      v-if="viewMode === 'tree'"
      class="flex-1 overflow-auto p-2 scrollbar-thin"
    >
      <template v-if="parsedJson !== null">
        <div
          v-for="node in treeNodes"
          :key="node.key"
          class="ml-0"
        >
          <component
            :is="'div'"
          >
            <!-- Recursive tree node rendering using inline approach -->
            <div class="flex items-start py-0.5 text-xs font-mono">
              <!-- Expand/collapse for containers -->
              <span
                v-if="node.type === 'object' || node.type === 'array'"
                class="w-4 h-4 flex items-center justify-center cursor-pointer flex-shrink-0 text-text-muted hover:text-text"
                @click="toggleTreeNode('$.' + node.key)"
              >
                <ChevronRight
                  class="w-3 h-3 transition-transform duration-150"
                  :class="{ 'rotate-90': expandedPaths.has('$.' + node.key) }"
                  :stroke-width="2"
                />
              </span>
              <span v-else class="w-4 flex-shrink-0" />

              <span class="text-purple-400">"{{ node.key }}"</span>
              <span class="text-text-muted mx-1">:</span>

              <template v-if="node.type === 'object' || node.type === 'array'">
                <span class="text-text-muted text-xs">{{ getContainerLabel(node) }}</span>
              </template>
              <template v-else>
                <span :class="getValueColor(node.type)">{{ formatValue(node.value, node.type) }}</span>
              </template>
            </div>

            <!-- Children if expanded -->
            <div
              v-if="(node.type === 'object' || node.type === 'array') && expandedPaths.has('$.' + node.key) && node.children"
              class="ml-4 border-l border-border/50 pl-2"
            >
              <div
                v-for="child in node.children"
                :key="child.key"
                class="flex items-start py-0.5 text-xs font-mono"
              >
                <span
                  v-if="child.type === 'object' || child.type === 'array'"
                  class="w-4 h-4 flex items-center justify-center cursor-pointer flex-shrink-0 text-text-muted hover:text-text"
                  @click="toggleTreeNode('$.' + node.key + '.' + child.key)"
                >
                  <ChevronRight
                    class="w-3 h-3 transition-transform duration-150"
                    :class="{ 'rotate-90': expandedPaths.has('$.' + node.key + '.' + child.key) }"
                    :stroke-width="2"
                  />
                </span>
                <span v-else class="w-4 flex-shrink-0" />

                <span class="text-purple-400">"{{ child.key }}"</span>
                <span class="text-text-muted mx-1">:</span>

                <template v-if="child.type === 'object' || child.type === 'array'">
                  <span class="text-text-muted text-xs">{{ getContainerLabel(child) }}</span>
                </template>
                <template v-else>
                  <span :class="getValueColor(child.type)">{{ formatValue(child.value, child.type) }}</span>
                </template>
              </div>
            </div>
          </component>
        </div>
      </template>
      <div v-else class="text-text-muted text-xs py-4 text-center">
        Invalid JSON
      </div>
    </div>

    <!-- Raw editor -->
    <div
      v-else
      class="flex-1 min-h-0"
    >
      <textarea
        :value="rawValue"
        :readonly="readonly"
        class="w-full h-full resize-none p-3 bg-base text-text text-xs font-mono leading-5 focus:outline-none scrollbar-thin"
        spellcheck="false"
        wrap="off"
        @input="onInput"
      />
    </div>

    <!-- Save bar (only when not readonly) -->
    <div
      v-if="!readonly"
      class="flex items-center justify-end gap-2 px-3 py-2 bg-surface-0 border-t border-border flex-shrink-0"
    >
      <span
        v-if="!isValid"
        class="text-xs text-danger mr-auto"
      >
        Invalid JSON
      </span>
      <button
        class="h-7 px-4 text-xs rounded font-medium transition-colors"
        :class="{
          'bg-accent text-white hover:bg-accent-hover': isValid,
          'bg-overlay-0 text-text-muted cursor-not-allowed': !isValid
        }"
        :disabled="!isValid"
        @click="onSave"
      >
        Save
      </button>
    </div>
  </div>
</template>
