<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { CLIHistoryEntry, FormatMode } from '@renderer/stores/cli.store'

const props = defineProps<{
  history: CLIHistoryEntry[]
  formatMode: FormatMode
}>()

const outputRef = ref<HTMLDivElement | null>(null)

// Auto-scroll to bottom on new entries
watch(
  () => props.history.length,
  () => {
    nextTick(() => {
      if (outputRef.value) {
        outputRef.value.scrollTop = outputRef.value.scrollHeight
      }
    })
  }
)

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function formatResult(result: unknown, mode: FormatMode): string {
  if (result === null || result === undefined) {
    return '(nil)'
  }

  if (typeof result === 'number') {
    return `(integer) ${result}`
  }

  if (mode === 'json') {
    return formatAsJson(result)
  }

  if (mode === 'table') {
    return formatAsTable(result)
  }

  // raw mode
  return formatAsRaw(result)
}

function formatAsRaw(result: unknown): string {
  if (result === null || result === undefined) {
    return '(nil)'
  }

  if (typeof result === 'number') {
    return `(integer) ${result}`
  }

  if (typeof result === 'string') {
    return `"${result}"`
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      return '(empty array)'
    }
    return result
      .map((item, idx) => `${idx + 1}) ${formatAsRaw(item)}`)
      .join('\n')
  }

  if (typeof result === 'object') {
    return JSON.stringify(result)
  }

  return String(result)
}

function formatAsJson(result: unknown): string {
  if (result === null || result === undefined) {
    return '(nil)'
  }

  if (typeof result === 'number') {
    return `(integer) ${result}`
  }

  if (typeof result === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(result)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return `"${result}"`
    }
  }

  if (Array.isArray(result) || typeof result === 'object') {
    try {
      return JSON.stringify(result, null, 2)
    } catch {
      return String(result)
    }
  }

  return String(result)
}

function formatAsTable(result: unknown): string {
  if (result === null || result === undefined) {
    return '(nil)'
  }

  if (typeof result === 'number') {
    return `(integer) ${result}`
  }

  if (typeof result === 'string') {
    return `"${result}"`
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      return '(empty array)'
    }

    // Check if it looks like a hash (even number of elements, alternating key/value)
    const allStrings = result.every(
      (item) => typeof item === 'string' || typeof item === 'number'
    )
    if (allStrings && result.length >= 2 && result.length % 2 === 0) {
      // Format as key-value table
      const rows: string[][] = []
      let maxKeyLen = 3 // "Key"
      let maxValLen = 5 // "Value"

      for (let i = 0; i < result.length; i += 2) {
        const key = String(result[i])
        const val = String(result[i + 1])
        maxKeyLen = Math.max(maxKeyLen, key.length)
        maxValLen = Math.max(maxValLen, val.length)
        rows.push([key, val])
      }

      const hSep = `+${'-'.repeat(maxKeyLen + 2)}+${'-'.repeat(maxValLen + 2)}+`
      const header = `| ${'Key'.padEnd(maxKeyLen)} | ${'Value'.padEnd(maxValLen)} |`

      const lines = [hSep, header, hSep]
      for (const [k, v] of rows) {
        lines.push(`| ${k.padEnd(maxKeyLen)} | ${v.padEnd(maxValLen)} |`)
      }
      lines.push(hSep)
      return lines.join('\n')
    }

    // Format as numbered list table
    const idxWidth = String(result.length).length
    let maxValLen = 5 // "Value"
    const strItems = result.map((item) => {
      const s = typeof item === 'string' ? item : JSON.stringify(item)
      maxValLen = Math.max(maxValLen, s.length)
      return s
    })

    // Cap max column width for readability
    maxValLen = Math.min(maxValLen, 80)

    const hSep = `+${'-'.repeat(idxWidth + 2)}+${'-'.repeat(maxValLen + 2)}+`
    const header = `| ${'#'.padEnd(idxWidth)} | ${'Value'.padEnd(maxValLen)} |`

    const lines = [hSep, header, hSep]
    for (let i = 0; i < strItems.length; i++) {
      const val = strItems[i].length > maxValLen
        ? strItems[i].substring(0, maxValLen - 3) + '...'
        : strItems[i]
      lines.push(`| ${String(i + 1).padStart(idxWidth)} | ${val.padEnd(maxValLen)} |`)
    }
    lines.push(hSep)
    return lines.join('\n')
  }

  return String(result)
}

const resultLines = computed(() => {
  return props.history.map((entry) => ({
    ...entry,
    formatted: formatResult(entry.result, props.formatMode)
  }))
})
</script>

<template>
  <div
    ref="outputRef"
    class="h-full overflow-y-auto overflow-x-hidden p-3 font-mono text-xs scrollbar-thin"
  >
    <div v-if="history.length === 0" class="text-text-muted text-center py-8">
      <p>Type a Redis command below to get started.</p>
      <p class="mt-1 text-xs">Press Tab for autocomplete, Up/Down for history.</p>
    </div>

    <div v-for="(entry, idx) in resultLines" :key="idx" class="mb-2">
      <!-- Timestamp + Command -->
      <div class="flex items-start gap-2">
        <span class="text-text-muted text-xs shrink-0 mt-px select-none">
          {{ formatTimestamp(entry.timestamp) }}
        </span>
        <span class="text-accent select-none shrink-0">&gt;</span>
        <span class="text-text break-all">{{ entry.command }}</span>
      </div>

      <!-- Result -->
      <div
        class="ml-[4.5rem] mt-0.5 whitespace-pre-wrap break-all"
        :class="entry.error ? 'text-danger' : 'text-text-secondary'"
      >{{ entry.formatted }}</div>
    </div>
  </div>
</template>
