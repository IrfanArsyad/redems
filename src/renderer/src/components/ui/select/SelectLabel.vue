<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@renderer/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('px-2 py-1.5 text-xs font-semibold text-text-muted', props.class)">
    <slot />
  </div>
</template>
