<script setup lang="ts">
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useMonitorStore } from '@renderer/stores/monitor.store'
import { useChartTheme } from '@renderer/composables/useChartTheme'

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps<{
  connectionId: string
}>()

const monitorStore = useMonitorStore()
const { getColors, makeBarChartOptions } = useChartTheme()

type TimeRange = '1m' | '5m' | '15m'
const timeRange = ref<TimeRange>('5m')

const timeRangeMs: Record<TimeRange, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000
}

const rangeEntries = computed(() => {
  const cutoff = Date.now() - timeRangeMs[timeRange.value]
  return monitorStore.entries.filter((e) => e.timestamp >= cutoff)
})

// Top commands by frequency
const commandFrequency = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of rangeEntries.value) {
    const cmd = entry.command.toUpperCase()
    counts.set(cmd, (counts.get(cmd) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
})

// Top keys accessed
const keyAccess = computed(() => {
  const counts = new Map<string, { count: number; lastCommand: string }>()
  for (const entry of rangeEntries.value) {
    if (entry.args.length > 0) {
      const key = entry.args[0]
      const existing = counts.get(key)
      if (existing) {
        existing.count++
        existing.lastCommand = entry.command.toUpperCase()
      } else {
        counts.set(key, { count: 1, lastCommand: entry.command.toUpperCase() })
      }
    }
  }
  return Array.from(counts.entries())
    .map(([key, data]) => ({ key, count: data.count, lastCommand: data.lastCommand }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
})

// Commands per second timeline (bucketed by 5s intervals)
const cpsTimeline = computed(() => {
  if (rangeEntries.value.length === 0) return { labels: [] as string[], data: [] as number[] }

  const bucketSize = 5000 // 5 seconds
  const now = Date.now()
  const rangeMs = timeRangeMs[timeRange.value]
  const bucketCount = Math.ceil(rangeMs / bucketSize)
  const start = now - rangeMs

  const buckets = new Array(bucketCount).fill(0)

  for (const entry of rangeEntries.value) {
    const bucketIndex = Math.floor((entry.timestamp - start) / bucketSize)
    if (bucketIndex >= 0 && bucketIndex < bucketCount) {
      buckets[bucketIndex]++
    }
  }

  // Convert counts to per-second rate
  const labels: string[] = []
  const data: number[] = []
  for (let i = 0; i < bucketCount; i++) {
    const ts = start + i * bucketSize
    const d = new Date(ts)
    labels.push(d.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }))
    data.push(buckets[i] / (bucketSize / 1000))
  }

  return { labels, data }
})

// Command frequency chart data (horizontal bar)
const commandChartData = computed(() => {
  const c = getColors()
  return {
    labels: commandFrequency.value.map(([cmd]) => cmd),
    datasets: [
      {
        label: 'Count',
        data: commandFrequency.value.map(([, count]) => count),
        backgroundColor: c.blue,
        borderWidth: 0,
        borderRadius: 4
      }
    ]
  }
})

const commandChartOptions = computed(() => makeBarChartOptions('Top Commands by Frequency'))

// CPS timeline chart data
const cpsChartData = computed(() => {
  const c = getColors()
  return {
    labels: cpsTimeline.value.labels,
    datasets: [
      {
        label: 'Commands/sec',
        data: cpsTimeline.value.data,
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

const cpsChartOptions = computed(() => {
  const c = getColors()
  const opts = makeBarChartOptions('Commands Per Second')
  return {
    ...opts,
    indexAxis: undefined,
    interaction: { intersect: false, mode: 'index' as const },
    scales: {
      x: {
        display: true,
        grid: { color: c.border, drawBorder: false },
        ticks: { color: c.textMuted, maxTicksLimit: 8, font: { size: 10 } }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: { color: c.border, drawBorder: false },
        ticks: { color: c.textMuted, font: { size: 10 } }
      }
    }
  }
})
</script>

<template>
  <div class="flex flex-col h-full bg-base">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-0">
      <span class="text-xs font-medium text-text">Command Profiler</span>
      <div class="flex-1" />

      <!-- Time Range Selector -->
      <div class="flex items-center gap-1 bg-overlay-0 rounded p-0.5">
        <button
          v-for="range in (['1m', '5m', '15m'] as TimeRange[])"
          :key="range"
          class="px-2 py-0.5 text-xs rounded transition-colors"
          :class="timeRange === range
            ? 'bg-accent text-white font-medium'
            : 'text-text-muted hover:text-text'"
          @click="timeRange = range"
        >
          {{ range }}
        </button>
      </div>

      <span class="text-xs text-text-muted tabular-nums">
        {{ rangeEntries.length.toLocaleString() }} entries in range
      </span>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-3 space-y-3">
      <!-- Charts Row -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Command Frequency Chart -->
        <div class="bg-surface-0 border border-border rounded-lg p-3 h-[320px]">
          <Line :data="commandChartData" :options="commandChartOptions" />
        </div>

        <!-- CPS Timeline Chart -->
        <div class="bg-surface-0 border border-border rounded-lg p-3 h-[320px]">
          <Line :data="cpsChartData" :options="cpsChartOptions" />
        </div>
      </div>

      <!-- Top Keys Table -->
      <div class="bg-surface-0 border border-border rounded-lg overflow-hidden">
        <div class="px-4 py-2 border-b border-border">
          <span class="text-xs font-medium text-text">Top Keys Accessed</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border bg-overlay-0/30">
                <th class="text-left px-4 py-2 font-medium text-text-muted">#</th>
                <th class="text-left px-4 py-2 font-medium text-text-muted">Key</th>
                <th class="text-left px-4 py-2 font-medium text-text-muted">Last Command</th>
                <th class="text-right px-4 py-2 font-medium text-text-muted">Access Count</th>
                <th class="px-4 py-2 font-medium text-text-muted">Frequency</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in keyAccess"
                :key="item.key"
                class="border-b border-border/50 hover:bg-overlay-0/20"
              >
                <td class="px-4 py-1.5 text-text-muted tabular-nums">{{ index + 1 }}</td>
                <td class="px-4 py-1.5 text-text font-mono truncate max-w-xs" :title="item.key">
                  {{ item.key }}
                </td>
                <td class="px-4 py-1.5">
                  <span class="px-1.5 py-0.5 text-xs bg-accent-muted text-accent rounded">
                    {{ item.lastCommand }}
                  </span>
                </td>
                <td class="px-4 py-1.5 text-right text-text tabular-nums">
                  {{ item.count.toLocaleString() }}
                </td>
                <td class="px-4 py-1.5 w-32">
                  <div class="h-1.5 bg-overlay-0/50 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-accent rounded-full"
                      :style="{
                        width: `${keyAccess.length > 0 ? (item.count / keyAccess[0].count * 100) : 0}%`
                      }"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty state for keys table -->
        <div
          v-if="keyAccess.length === 0"
          class="px-4 py-8 text-center text-xs text-text-muted"
        >
          No key access data in the selected time range. Start the monitor to collect data.
        </div>
      </div>
    </div>
  </div>
</template>
