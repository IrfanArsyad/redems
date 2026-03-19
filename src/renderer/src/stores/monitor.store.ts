import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MonitorEntry, MemoryAnalysisResult } from '@shared/types/redis.types'
import { IPC } from '@shared/constants/channels'

export interface MetricsSnapshot {
  timestamp: number
  opsPerSec: number
  memory: number
  clients: number
  hitRate: number
}

const MAX_ENTRIES = 5000
const MAX_METRICS = 300

export const useMonitorStore = defineStore('monitor', () => {
  // State
  const entries = ref<MonitorEntry[]>([])
  const running = ref<boolean>(false)
  const paused = ref<boolean>(false)
  const filter = ref<string>('')
  const metricsHistory = ref<MetricsSnapshot[]>([])
  const memoryAnalysis = ref<MemoryAnalysisResult | null>(null)
  const analyzingMemory = ref<boolean>(false)
  const analyzeProgress = ref<{ scanned: number; total: number }>({ scanned: 0, total: 0 })

  let metricsPollingTimer: ReturnType<typeof setInterval> | null = null
  let unsubMonitor: (() => void) | null = null
  let unsubMemoryProgress: (() => void) | null = null

  // Getters
  const filteredEntries = computed<MonitorEntry[]>(() => {
    if (!filter.value) return entries.value
    const lowerFilter = filter.value.toLowerCase()
    return entries.value.filter(
      (e) =>
        e.command.toLowerCase().includes(lowerFilter) ||
        e.args.some((a) => a.toLowerCase().includes(lowerFilter)) ||
        e.client.toLowerCase().includes(lowerFilter)
    )
  })

  const entryCount = computed<number>(() => entries.value.length)

  // Ring buffer push helper
  function pushEntry(entry: MonitorEntry): void {
    if (paused.value) return
    entries.value.push(entry)
    if (entries.value.length > MAX_ENTRIES) {
      entries.value = entries.value.slice(entries.value.length - MAX_ENTRIES)
    }
  }

  function pushMetrics(snapshot: MetricsSnapshot): void {
    metricsHistory.value.push(snapshot)
    if (metricsHistory.value.length > MAX_METRICS) {
      metricsHistory.value = metricsHistory.value.slice(metricsHistory.value.length - MAX_METRICS)
    }
  }

  // Actions
  async function startMonitor(connId: string): Promise<void> {
    if (running.value) return
    try {
      await window.api.invoke(IPC.MONITOR_START, connId)
      running.value = true
      paused.value = false

      // Listen for monitor data events
      unsubMonitor = window.api.on(IPC.MONITOR_DATA, (entry: MonitorEntry) => {
        pushEntry(entry)
      })
    } catch (err) {
      console.error('Failed to start monitor:', err)
      throw err
    }
  }

  async function stopMonitor(connId: string): Promise<void> {
    if (!running.value) return
    try {
      await window.api.invoke(IPC.MONITOR_STOP, connId)
    } catch (err) {
      console.error('Failed to stop monitor:', err)
    } finally {
      running.value = false
      paused.value = false
      if (unsubMonitor) {
        unsubMonitor()
        unsubMonitor = null
      }
    }
  }

  function togglePause(): void {
    paused.value = !paused.value
  }

  function setFilter(value: string): void {
    filter.value = value
  }

  function clearEntries(): void {
    entries.value = []
  }

  async function fetchMetrics(connId: string): Promise<void> {
    try {
      const info = await window.api.invoke(IPC.SERVER_INFO, connId)
      const snapshot: MetricsSnapshot = {
        timestamp: Date.now(),
        opsPerSec: info.instantaneousOpsPerSec ?? 0,
        memory: parseMemoryBytes(info.usedMemory),
        clients: info.connectedClients ?? 0,
        hitRate: info.hitRate ?? 0
      }
      pushMetrics(snapshot)
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    }
  }

  function startMetricsPolling(connId: string, interval: number = 1000): void {
    stopMetricsPolling()
    // Fetch immediately
    fetchMetrics(connId)
    metricsPollingTimer = setInterval(() => {
      fetchMetrics(connId)
    }, interval)
  }

  function stopMetricsPolling(): void {
    if (metricsPollingTimer !== null) {
      clearInterval(metricsPollingTimer)
      metricsPollingTimer = null
    }
  }

  async function analyzeMemory(
    connId: string,
    pattern: string = '*',
    sampleSize: number = 1000
  ): Promise<void> {
    analyzingMemory.value = true
    analyzeProgress.value = { scanned: 0, total: 0 }
    memoryAnalysis.value = null

    // Listen for progress events
    unsubMemoryProgress = window.api.on(
      IPC.MEMORY_PROGRESS,
      (progress: { scanned: number; total: number }) => {
        analyzeProgress.value = progress
      }
    )

    try {
      const result = await window.api.invoke(IPC.MEMORY_ANALYZE, connId, pattern, sampleSize)
      memoryAnalysis.value = result
    } catch (err) {
      console.error('Failed to analyze memory:', err)
      throw err
    } finally {
      analyzingMemory.value = false
      if (unsubMemoryProgress) {
        unsubMemoryProgress()
        unsubMemoryProgress = null
      }
    }
  }

  function parseMemoryBytes(memStr: string): number {
    if (!memStr) return 0
    const num = parseFloat(memStr)
    if (isNaN(num)) return 0
    const lower = memStr.toLowerCase()
    if (lower.includes('gb') || lower.includes('g')) return num * 1024 * 1024 * 1024
    if (lower.includes('mb') || lower.includes('m')) return num * 1024 * 1024
    if (lower.includes('kb') || lower.includes('k')) return num * 1024
    return num
  }

  function $dispose(): void {
    stopMetricsPolling()
    if (unsubMonitor) {
      unsubMonitor()
      unsubMonitor = null
    }
    if (unsubMemoryProgress) {
      unsubMemoryProgress()
      unsubMemoryProgress = null
    }
  }

  return {
    // State
    entries,
    running,
    paused,
    filter,
    metricsHistory,
    memoryAnalysis,
    analyzingMemory,
    analyzeProgress,

    // Getters
    filteredEntries,
    entryCount,

    // Actions
    startMonitor,
    stopMonitor,
    togglePause,
    setFilter,
    clearEntries,
    fetchMetrics,
    startMetricsPolling,
    stopMetricsPolling,
    analyzeMemory,
    $dispose
  }
})
