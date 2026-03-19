<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useCLIStore } from '@renderer/stores/cli.store'
import CLIOutput from './CLIOutput.vue'
import CLIInput from './CLIInput.vue'
import { Terminal, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const cliStore = useCLIStore()

function handleExecute(command: string): void {
  cliStore.execute(props.connectionId, command)
}

function handleClear(): void {
  cliStore.clearOutput()
}

function handleFormatChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  cliStore.setFormatMode(target.value as 'raw' | 'json' | 'table')
}

onMounted(() => {
  // Focus CLI on mount
})

onUnmounted(() => {
  // Cleanup if needed
})
</script>

<template>
  <div class="flex flex-col h-full bg-crust">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface-0 shrink-0"
    >
      <div class="flex items-center gap-2">
        <div class="flex items-center justify-center w-5 h-5 rounded bg-accent-muted">
          <Terminal class="w-3 h-3 text-accent" />
        </div>
        <span class="text-xs font-semibold text-text">CLI</span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Format mode selector -->
        <select
          :value="cliStore.formatMode"
          @change="handleFormatChange"
          class="text-xs bg-input-bg text-text-secondary border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent/20 focus:border-accent/40 appearance-none cursor-pointer transition-all hover:border-text-faint"
        >
          <option value="raw">Raw</option>
          <option value="json">JSON</option>
          <option value="table">Table</option>
        </select>

        <!-- Clear button -->
        <button
          @click="handleClear"
          class="flex items-center gap-1 text-xs text-text-muted hover:text-danger px-2 py-1 rounded-md hover:bg-danger-muted transition-colors font-medium"
          title="Clear output"
        >
          <Trash2 class="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <!-- Output area -->
    <div class="flex-1 min-h-0 overflow-hidden">
      <CLIOutput :history="cliStore.formattedHistory" :format-mode="cliStore.formatMode" />
    </div>

    <!-- Input area -->
    <div class="shrink-0 border-t border-border">
      <CLIInput :connection-id="connectionId" @execute="handleExecute" />
    </div>
  </div>
</template>
