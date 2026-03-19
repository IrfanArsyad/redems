import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CLIHistoryEntry {
  command: string
  result: unknown
  timestamp: number
  error?: boolean
}

export type FormatMode = 'raw' | 'json' | 'table'

const MAX_HISTORY = 1000

export const useCLIStore = defineStore('cli', () => {
  // State
  const history = ref<CLIHistoryEntry[]>([])
  const commandHistory = ref<string[]>([])
  const historyIndex = ref<number>(-1)
  const inputValue = ref<string>('')
  const formatMode = ref<FormatMode>('raw')
  const loading = ref<boolean>(false)

  // Getters
  const formattedHistory = computed<CLIHistoryEntry[]>(() => {
    return history.value
  })

  // Actions
  function addToHistory(entry: CLIHistoryEntry): void {
    history.value.push(entry)
    // Ring buffer: drop oldest when exceeding max
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(history.value.length - MAX_HISTORY)
    }
  }

  function addToCommandHistory(command: string): void {
    // Avoid consecutive duplicates
    if (
      commandHistory.value.length === 0 ||
      commandHistory.value[commandHistory.value.length - 1] !== command
    ) {
      commandHistory.value.push(command)
      // Ring buffer for command history as well
      if (commandHistory.value.length > MAX_HISTORY) {
        commandHistory.value = commandHistory.value.slice(
          commandHistory.value.length - MAX_HISTORY
        )
      }
    }
    // Reset navigation index
    historyIndex.value = -1
  }

  async function execute(connId: string, command: string): Promise<void> {
    const trimmed = command.trim()
    if (!trimmed) return

    addToCommandHistory(trimmed)
    loading.value = true

    try {
      const result = await window.api.invoke('cli:execute', connId, trimmed)
      addToHistory({
        command: trimmed,
        result,
        timestamp: Date.now(),
        error: false
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      addToHistory({
        command: trimmed,
        result: message,
        timestamp: Date.now(),
        error: true
      })
    } finally {
      loading.value = false
    }
  }

  function navigateHistory(direction: 'up' | 'down'): string {
    if (commandHistory.value.length === 0) return inputValue.value

    if (direction === 'up') {
      if (historyIndex.value === -1) {
        // Start from the end of history
        historyIndex.value = commandHistory.value.length - 1
      } else if (historyIndex.value > 0) {
        historyIndex.value--
      }
      return commandHistory.value[historyIndex.value] ?? ''
    } else {
      // direction === 'down'
      if (historyIndex.value === -1) {
        return inputValue.value
      }
      if (historyIndex.value < commandHistory.value.length - 1) {
        historyIndex.value++
        return commandHistory.value[historyIndex.value] ?? ''
      } else {
        // Past the end, return to blank
        historyIndex.value = -1
        return ''
      }
    }
  }

  function clearOutput(): void {
    history.value = []
  }

  function setFormatMode(mode: FormatMode): void {
    formatMode.value = mode
  }

  return {
    // State
    history,
    commandHistory,
    historyIndex,
    inputValue,
    formatMode,
    loading,

    // Getters
    formattedHistory,

    // Actions
    execute,
    addToHistory,
    addToCommandHistory,
    navigateHistory,
    clearOutput,
    setFormatMode
  }
})
