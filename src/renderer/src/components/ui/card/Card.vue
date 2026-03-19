<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@renderer/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    :class="cn('rounded-xl border border-border bg-surface-0 text-text shadow-sm', props.class)"
  >
    <slot />
  </div>
</template>
