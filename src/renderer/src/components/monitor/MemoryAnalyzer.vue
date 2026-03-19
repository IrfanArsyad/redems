<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Box } from 'lucide-vue-next'
import { Line } from 'vue-chartjs'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  ArcElement,
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
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps<{
  connectionId: string
}>()

const monitorStore = useMonitorStore()
const { getColors, palette, makeBarChartOptions, typeColors } = useChartTheme()
const pattern = ref<string>('*')
const sampleSize = ref<number>(1000)

async function startAnalysis(): Promise<void> {
  await monitorStore.analyzeMemory(props.connectionId, pattern.value, sampleSize.value)
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${bytes} B`
}

const progressPercent = computed<number>(() => {
  const p = monitorStore.analyzeProgress
  if (p.total === 0) return 0
  return Math.round((p.scanned / p.total) * 100)
})

const result = computed(() => monitorStore.memoryAnalysis)

const avgMemory = computed<number>(() => {
  if (!result.value || result.value.totalKeys === 0) return 0
  return result.value.totalMemory / result.value.totalKeys
})

// Namespace bar chart data
const namespaceChartData = computed(() => {
  if (!result.value) return { labels: [], datasets: [] }
  const entries = Object.entries(result.value.byNamespace)
    .sort((a, b) => b[1].memory - a[1].memory)
    .slice(0, 15)

  const colors = palette()
  return {
    labels: entries.map(([ns]) => ns),
    datasets: [
      {
        label: 'Memory',
        data: entries.map(([, data]) => data.memory),
        backgroundColor: entries.map((_, i) => colors[i % colors.length]),
        borderWidth: 0,
        borderRadius: 4
      }
    ]
  }
})

const namespaceChartOptions = computed(() => {
  const opts = makeBarChartOptions('Memory by Namespace', (v) => formatBytes(Number(v)))
  return {
    ...opts,
    animation: { duration: 300 },
    plugins: {
      ...opts.plugins,
      tooltip: {
        ...opts.plugins.tooltip,
        callbacks: {
          label: (ctx: { parsed: { x: number } }) => formatBytes(ctx.parsed.x)
        }
      }
    }
  }
})
</script>

<template>
  <div class="flex flex-col h-full bg-base overflow-auto">
    <!-- Analysis Controls -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface-0">
      <span class="text-xs font-medium text-text">Memory Analyzer</span>

      <div class="flex items-center gap-2 ml-4">
        <label class="text-xs text-text-muted">Pattern:</label>
        <input
          v-model="pattern"
          type="text"
          placeholder="*"
          class="w-36 px-2 py-1 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div class="flex items-center gap-2">
        <label class="text-xs text-text-muted">Sample size:</label>
        <input
          v-model.number="sampleSize"
          type="number"
          min="100"
          max="100000"
          step="100"
          class="w-24 px-2 py-1 text-xs bg-input-bg border border-border rounded text-text focus:border-accent focus:outline-none"
        />
      </div>

      <button
        class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded bg-accent-muted text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
        :disabled="monitorStore.analyzingMemory"
        @click="startAnalysis"
      >
        <Search class="w-3.5 h-3.5" :stroke-width="1.5" />
        {{ monitorStore.analyzingMemory ? 'Analyzing...' : 'Analyze' }}
      </button>
    </div>

    <!-- Progress Bar -->
    <div v-if="monitorStore.analyzingMemory" class="px-4 py-2 bg-surface-0 border-b border-border">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-text-muted">
          Scanning keys... {{ monitorStore.analyzeProgress.scanned.toLocaleString() }} / {{ monitorStore.analyzeProgress.total.toLocaleString() }}
        </span>
        <span class="text-xs text-accent ml-auto tabular-nums">{{ progressPercent }}%</span>
      </div>
      <div class="h-1.5 bg-overlay-0 rounded-full overflow-hidden">
        <div
          class="h-full bg-accent rounded-full transition-all duration-300"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <!-- Results -->
    <div v-if="result" class="flex-1 overflow-auto p-4 space-y-4">
      <!-- Summary Cards -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-surface-0 border border-border rounded-lg p-4">
          <div class="text-xs text-text-muted uppercase tracking-wider mb-1">Total Keys</div>
          <div class="text-xl font-semibold text-text tabular-nums">
            {{ result.totalKeys.toLocaleString() }}
          </div>
          <div class="text-xs text-text-muted mt-1">{{ result.scannedKeys.toLocaleString() }} scanned</div>
        </div>

        <div class="bg-surface-0 border border-border rounded-lg p-4">
          <div class="text-xs text-text-muted uppercase tracking-wider mb-1">Total Memory</div>
          <div class="text-xl font-semibold text-text">
            {{ formatBytes(result.totalMemory) }}
          </div>
        </div>

        <div class="bg-surface-0 border border-border rounded-lg p-4">
          <div class="text-xs text-text-muted uppercase tracking-wider mb-1">Avg Memory / Key</div>
          <div class="text-xl font-semibold text-text">
            {{ formatBytes(avgMemory) }}
          </div>
        </div>
      </div>

      <!-- Top 20 Keys Table -->
      <div class="bg-surface-0 border border-border rounded-lg overflow-hidden">
        <div class="px-4 py-2 border-b border-border">
          <span class="text-xs font-medium text-text">Top 20 Keys by Memory</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border bg-overlay-0/30">
                <th class="text-left px-4 py-2 font-medium text-text-muted">#</th>
                <th class="text-left px-4 py-2 font-medium text-text-muted">Key</th>
                <th class="text-left px-4 py-2 font-medium text-text-muted">Type</th>
                <th class="text-right px-4 py-2 font-medium text-text-muted">Memory</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in result.topKeys.slice(0, 20)"
                :key="item.key"
                class="border-b border-border/50 hover:bg-overlay-0/20"
              >
                <td class="px-4 py-1.5 text-text-muted tabular-nums">{{ index + 1 }}</td>
                <td class="px-4 py-1.5 text-text font-mono truncate max-w-xs" :title="item.key">
                  {{ item.key }}
                </td>
                <td class="px-4 py-1.5">
                  <span
                    class="inline-block px-1.5 py-0.5 text-xs rounded"
                    :class="{
                      'bg-accent-muted text-accent': item.type === 'string',
                      'bg-success-muted text-success': item.type === 'hash',
                      'bg-warning-muted text-warning': item.type === 'list',
                      'bg-info-muted text-info': ['set', 'zset'].includes(item.type),
                      'bg-danger-muted text-danger': item.type === 'stream',
                      'bg-overlay-0 text-text-muted': !['string','hash','list','set','zset','stream'].includes(item.type)
                    }"
                  >
                    {{ item.type }}
                  </span>
                </td>
                <td class="px-4 py-1.5 text-right text-text tabular-nums">
                  {{ formatBytes(item.memory) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Namespace Bar Chart -->
        <div class="bg-surface-0 border border-border rounded-lg p-3 h-[320px]">
          <Line :data="namespaceChartData" :options="namespaceChartOptions" />
        </div>

        <!-- Type Doughnut Chart - using Line as base with doughnut-like config via arc -->
        <div class="bg-surface-0 border border-border rounded-lg p-3 h-[320px]">
          <!-- Manual type distribution since vue-chartjs Doughnut requires separate import -->
          <div class="h-full flex flex-col">
            <div class="text-xs text-text-muted text-center mb-2">Memory by Type</div>
            <div class="flex-1 flex items-center justify-center">
              <div class="space-y-2 w-full px-4">
                <div
                  v-for="([type, data]) in Object.entries(result.byType).sort((a, b) => b[1].memory - a[1].memory)"
                  :key="type"
                  class="flex items-center gap-2"
                >
                  <span
                    class="w-3 h-3 rounded-sm shrink-0"
                    :style="{ backgroundColor: typeColors[type] || getColors().textMuted }"
                  />
                  <span class="text-xs text-text-secondary w-16">{{ type }}</span>
                  <div class="flex-1 h-5 bg-overlay-0/50 rounded overflow-hidden">
                    <div
                      class="h-full rounded transition-all duration-500"
                      :style="{
                        width: `${result.totalMemory > 0 ? (data.memory / result.totalMemory * 100) : 0}%`,
                        backgroundColor: typeColors[type] || '#6c7086'
                      }"
                    />
                  </div>
                  <span class="text-xs text-text-muted tabular-nums w-20 text-right">
                    {{ formatBytes(data.memory) }}
                  </span>
                  <span class="text-xs text-text-muted tabular-nums w-12 text-right">
                    {{ data.count }} keys
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!monitorStore.analyzingMemory"
      class="flex-1 flex flex-col items-center justify-center text-text-muted"
    >
      <Box class="w-12 h-12 mb-3 opacity-30" :stroke-width="1.5" />
      <span class="text-xs">Configure pattern and sample size, then click Analyze</span>
    </div>
  </div>
</template>
