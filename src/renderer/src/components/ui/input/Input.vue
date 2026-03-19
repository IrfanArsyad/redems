<script setup lang="ts">
import { type HTMLAttributes, useAttrs } from 'vue'
import { cn } from '@renderer/lib/utils'

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const attrs = useAttrs()
</script>

<template>
  <input
    :class="
      cn(
        'flex h-9 w-full rounded-md border border-border bg-input-bg px-3 py-1 text-md text-text shadow-sm transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50',
        props.class
      )
    "
    :value="modelValue"
    :default-value="defaultValue"
    v-bind="attrs"
    @input="emits('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
