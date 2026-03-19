<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
    <!-- Icon -->
    <div
      v-if="icon"
      class="text-4xl mb-4 opacity-60 select-none"
    >
      {{ icon }}
    </div>

    <!-- Title -->
    <h3 class="text-md font-medium text-text-secondary mb-1.5">
      {{ title }}
    </h3>

    <!-- Description -->
    <p
      v-if="description"
      class="text-xs text-text-muted max-w-[280px] leading-relaxed"
    >
      {{ description }}
    </p>

    <!-- Action slot -->
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
