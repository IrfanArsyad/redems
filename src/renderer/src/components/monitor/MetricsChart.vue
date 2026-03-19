<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Play, Square } from 'lucide-vue-next'
import { Line } from 'vue-chartjs'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js'
import { useMonitorStore } from '@renderer/stores/monitor.store'
import { useChartTheme } from '@renderer/composables/useChartTheme'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const props = defineProps<{
  connectionId: string
}>()

const monitorStore = useMonitorStore()
const { getColors, makeChartOptions: makeBaseChartOptions } = useChartTheme()
const polling = ref<boolean>(false)

function startPolling(): void {
  monitorStore.startMetricsPolling(props.connectionId, 1000)
  polling.value = true
}

function stopPolling(): void {
  monitorStore.stopMetricsPolling()
  polling.value = false
}

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' })
}

function formatMemory(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

const labels = computed<string[]>(() =>
  monitorStore.metricsHistory.map((m) => formatTime(m.timestamp))
)

const opsChartData = computed(() => {
  const c = getColors()
  return {
    labels: labels.value,
    datasets: [
      {
        label: 'Commands/sec',
        data: monitorStore.metricsHistory.map((m) => m.opsPerSec),
        borderColor: c.blue,
        backgroundColor: c.blueBg,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5
      }
    ]
  }
})

const memoryChartData = computed(() => {
  const c = getColors()
  return {
    labels: labels.value,
    datasets: [
      {
        label: 'Memory',
        data: monitorStore.metricsHistory.map((m) => m.memory),
        borderColor: c.green,
        backgroundColor: c.greenBg,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5
      }
    ]
  }
})

const clientsChartData = computed(() => {
  const c = getColors()
  return {
    labels: labels.value,
    datasets: [
      {
        label: 'Clients',
        data: monitorStore.metricsHistory.map((m) => m.clients),
        borderColor: c.orange,
        backgroundColor: c.orangeBg,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5
      }
    ]
  }
})

const hitRateChartData = computed(() => {
  const c = getColors()
  return {
    labels: labels.value,
    datasets: [
      {
        label: 'Hit Rate %',
        data: monitorStore.metricsHistory.map((m) => m.hitRate),
        borderColor: c.purple,
        backgroundColor: c.purpleBg,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5
      }
    ]
  }
})

const opsOptions = computed(() => makeBaseChartOptions('Commands / sec'))
const memoryOptions = computed(() =>
  makeBaseChartOptions('Memory Usage', (v) => formatMemory(Number(v)))
)
const clientsOptions = computed(() => makeBaseChartOptions('Connected Clients'))
const hitRateOptions = computed(() =>
  makeBaseChartOptions('Hit Rate %', (v) => `${Number(v).toFixed(1)}%`)
)
</script>

<template>
  <div class="flex flex-col h-full bg-base">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-0">
      <span class="text-xs font-medium text-text">Metrics Dashboard</span>
      <div class="flex-1" />

      <button
        v-if="!polling"
        class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-success-muted text-success hover:bg-success/25 transition-colors"
        @click="startPolling"
      >
        <Play class="w-3.5 h-3.5" :stroke-width="1.5" />
        Start Polling
      </button>
      <button
        v-else
        class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-danger-muted text-danger hover:bg-danger/25 transition-colors"
        @click="stopPolling"
      >
        <Square class="w-3.5 h-3.5" :stroke-width="1.5" />
        Stop Polling
      </button>

      <span class="text-xs text-text-muted tabular-nums">
        {{ monitorStore.metricsHistory.length }} data points
      </span>
    </div>

    <!-- Charts Grid (2x2) -->
    <div class="flex-1 overflow-auto p-3">
      <div class="grid grid-cols-2 gap-3 h-full min-h-[400px]">
        <!-- Commands/sec -->
        <div class="bg-surface-0 border border-border rounded-lg p-3 flex flex-col">
          <div class="flex-1 min-h-0">
            <Line :data="opsChartData" :options="opsOptions" />
          </div>
        </div>

        <!-- Memory Usage -->
        <div class="bg-surface-0 border border-border rounded-lg p-3 flex flex-col">
          <div class="flex-1 min-h-0">
            <Line :data="memoryChartData" :options="memoryOptions" />
          </div>
        </div>

        <!-- Connected Clients -->
        <div class="bg-surface-0 border border-border rounded-lg p-3 flex flex-col">
          <div class="flex-1 min-h-0">
            <Line :data="clientsChartData" :options="clientsOptions" />
          </div>
        </div>

        <!-- Hit Rate -->
        <div class="bg-surface-0 border border-border rounded-lg p-3 flex flex-col">
          <div class="flex-1 min-h-0">
            <Line :data="hitRateChartData" :options="hitRateOptions" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
