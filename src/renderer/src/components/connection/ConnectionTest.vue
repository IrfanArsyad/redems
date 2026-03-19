<script setup lang="ts">
import { LoaderCircle, CircleCheck, CircleX } from 'lucide-vue-next'

defineProps<{
  testing: boolean
  result: { success: boolean; message: string; latency?: number; serverVersion?: string } | null
}>()
</script>

<template>
  <div class="flex items-center gap-2.5 text-md">
    <!-- Spinner while testing -->
    <template v-if="testing">
      <LoaderCircle class="h-4 w-4 animate-spin text-accent" />
      <span class="text-text-muted">Testing connection...</span>
    </template>

    <!-- Success result -->
    <template v-else-if="result && result.success">
      <CircleCheck class="h-4 w-4 flex-shrink-0 text-success" />
      <span class="font-medium text-success">Connected successfully</span>
      <span v-if="result.latency != null" class="text-xs text-text-muted">
        {{ result.latency }}ms
      </span>
      <span v-if="result.serverVersion" class="text-xs text-text-muted">
        &middot; v{{ result.serverVersion }}
      </span>
    </template>

    <!-- Error result -->
    <template v-else-if="result && !result.success">
      <CircleX class="h-4 w-4 flex-shrink-0 text-danger" />
      <span class="truncate text-danger">{{ result.message }}</span>
    </template>
  </div>
</template>
