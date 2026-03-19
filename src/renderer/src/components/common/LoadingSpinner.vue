<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    label?: string
  }>(),
  {
    size: 'md',
    label: ''
  }
)

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return { container: 'w-4 h-4', border: 'border-[2px]' }
    case 'md':
      return { container: 'w-8 h-8', border: 'border-[3px]' }
    case 'lg':
      return { container: 'w-12 h-12', border: 'border-[3px]' }
  }
})

const labelSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-xs'
    case 'md':
      return 'text-xs'
    case 'lg':
      return 'text-md'
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div
      class="rounded-full border-overlay-0 border-t-accent animate-spin"
      :class="[sizeClasses.container, sizeClasses.border]"
    />
    <span
      v-if="label"
      class="text-text-muted"
      :class="labelSize"
    >
      {{ label }}
    </span>
  </div>
</template>
