<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RedisStreamEntry } from '@shared/types/redis.types'
import { Copy, Check } from 'lucide-vue-next'

const props = defineProps<{
  entry: RedisStreamEntry
}>()

const copied = ref<boolean>(false)

const fields = computed(() => {
  return Object.entries(props.entry.fields)
})

function isJson(str: string): boolean {
  if (!str) return false
  const trimmed = str.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed)
      return true
    } catch {
      return false
    }
  }
  return false
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

function entryAsJson(): string {
  return JSON.stringify(
    {
      id: props.entry.id,
      fields: props.entry.fields
    },
    null,
    2
  )
}

async function copyAsJson(): Promise<void> {
  try {
    await navigator.clipboard.writeText(entryAsJson())
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // Clipboard access denied
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Entry ID -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-text-muted">Entry ID:</span>
      <span class="text-md font-semibold font-mono text-accent">{{ entry.id }}</span>
      <div class="flex-1" />
      <button
        class="flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors"
        :class="copied ? 'text-success bg-success/10' : 'text-text-muted hover:text-text hover:bg-overlay-0/50'"
        @click="copyAsJson"
      >
        <Copy v-if="!copied" class="w-3 h-3" :stroke-width="1.5" />
        <Check v-else class="w-3 h-3" :stroke-width="2" />
        {{ copied ? 'Copied' : 'Copy JSON' }}
      </button>
    </div>

    <!-- Field-Value Table -->
    <table class="w-full text-xs border border-border rounded overflow-hidden">
      <thead>
        <tr class="bg-overlay-0/30 border-b border-border">
          <th class="text-left px-3 py-1.5 font-medium text-text-muted w-1/4">Field</th>
          <th class="text-left px-3 py-1.5 font-medium text-text-muted">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="([field, value]) in fields"
          :key="field"
          class="border-b border-border/30"
        >
          <td class="px-3 py-1.5 font-mono text-accent align-top">
            {{ field }}
          </td>
          <td class="px-3 py-1.5 text-text">
            <pre
              v-if="isJson(value)"
              class="font-mono text-xs whitespace-pre-wrap break-all text-text-secondary"
            >{{ formatJson(value) }}</pre>
            <span v-else class="break-all">{{ value }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
