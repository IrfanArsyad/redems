<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Search, X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    debounce?: number
  }>(),
  {
    placeholder: 'Search...',
    debounce: 300
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const localValue = ref(props.modelValue)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.modelValue,
  (newVal) => {
    localValue.value = newVal
  }
)

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  localValue.value = target.value

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    emit('update:modelValue', localValue.value)
  }, props.debounce)
}

function clear(): void {
  localValue.value = ''
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  emit('update:modelValue', '')
}

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

<template>
  <div class="relative flex items-center">
    <!-- Search icon -->
    <Search class="absolute left-2.5 w-3.5 h-3.5 text-text-muted pointer-events-none" :stroke-width="2" />

    <!-- Input -->
    <input
      type="text"
      :value="localValue"
      :placeholder="placeholder"
      class="w-full h-8 pl-8 pr-8 text-xs bg-input-bg border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
      @input="onInput"
    />

    <!-- Clear button -->
    <button
      v-if="localValue"
      class="absolute right-2 flex items-center justify-center w-4 h-4 rounded-sm hover:bg-overlay-0 text-text-muted hover:text-text transition-colors duration-100"
      @click="clear"
      title="Clear search"
    >
      <X class="w-3 h-3" :stroke-width="1.5" />
    </button>
  </div>
</template>
