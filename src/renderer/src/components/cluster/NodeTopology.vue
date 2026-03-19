<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { RedisClusterNode } from '@shared/types/redis.types'
import { AlertCircle } from 'lucide-vue-next'
import { useChartTheme } from '@renderer/composables/useChartTheme'

const props = defineProps<{
  nodes: RedisClusterNode[]
}>()

const { getColors } = useChartTheme()
const hoveredNode = ref<string | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)

// Layout constants
const masterRadius = 28
const replicaRadius = 18
const masterY = 80
const replicaY = 220
const padding = 60
const tooltipWidth = 240

const masters = computed(() =>
  props.nodes.filter((n) => n.role === 'master')
)

const replicas = computed(() =>
  props.nodes.filter((n) => n.role === 'slave')
)

const svgWidth = computed(() => {
  const count = Math.max(masters.value.length, 1)
  return count * 120 + padding * 2
})

const svgHeight = computed(() => {
  const hasReplicas = replicas.value.length > 0
  return hasReplicas ? 300 : 160
})

function masterX(index: number): number {
  const count = masters.value.length
  if (count === 0) return svgWidth.value / 2
  const spacing = (svgWidth.value - padding * 2) / count
  return padding + spacing * index + spacing / 2
}

// Group replicas by their master
const replicasByMaster = computed(() => {
  const map = new Map<string, RedisClusterNode[]>()
  for (const r of replicas.value) {
    if (r.master) {
      if (!map.has(r.master)) {
        map.set(r.master, [])
      }
      map.get(r.master)!.push(r)
    }
  }
  return map
})

interface ReplicaPosition {
  node: RedisClusterNode
  x: number
  y: number
  masterX: number
  masterY: number
}

const replicaPositions = computed<ReplicaPosition[]>(() => {
  const positions: ReplicaPosition[] = []

  for (let i = 0; i < masters.value.length; i++) {
    const master = masters.value[i]
    const mx = masterX(i)
    const reps = replicasByMaster.value.get(master.id) || []

    for (let j = 0; j < reps.length; j++) {
      const offsetX = reps.length === 1 ? 0 : (j - (reps.length - 1) / 2) * 60
      positions.push({
        node: reps[j],
        x: mx + offsetX,
        y: replicaY,
        masterX: mx,
        masterY: masterY
      })
    }
  }

  return positions
})

const hoveredNodeData = computed<RedisClusterNode | null>(() => {
  if (!hoveredNode.value) return null
  return props.nodes.find((n) => n.id === hoveredNode.value) || null
})

function formatAddress(addr: string): string {
  // Truncate for label display
  const parts = addr.split(':')
  if (parts.length === 2) {
    const host = parts[0]
    const port = parts[1]
    if (host.length > 12) {
      return `...${host.substring(host.length - 8)}:${port}`
    }
    return addr
  }
  return addr.length > 16 ? `...${addr.substring(addr.length - 12)}` : addr
}

function nodeColor(node: RedisClusterNode): string {
  const c = getColors()
  if (node.linkState !== 'connected') return c.red
  return node.role === 'master' ? c.blue : c.green
}

function nodeStroke(node: RedisClusterNode): string {
  const c = getColors()
  if (node.linkState !== 'connected') return c.red
  return node.role === 'master' ? c.sky : c.teal
}
</script>

<template>
  <div class="flex flex-col h-full bg-base overflow-auto">
    <!-- Empty state -->
    <div
      v-if="nodes.length === 0"
      class="flex flex-col items-center justify-center h-full text-text-muted"
    >
      <AlertCircle class="w-10 h-10 mb-3 opacity-30" :stroke-width="1.5" />
      <span class="text-xs">No cluster nodes available</span>
    </div>

    <!-- SVG Topology -->
    <div v-else class="flex-1 overflow-auto p-4 flex items-start justify-center">
      <svg
        ref="svgRef"
        :width="svgWidth"
        :height="svgHeight"
        class="select-none"
      >
        <!-- Connections from masters to replicas -->
        <line
          v-for="rp in replicaPositions"
          :key="`line-${rp.node.id}`"
          :x1="rp.masterX"
          :y1="masterY + masterRadius"
          :x2="rp.x"
          :y2="rp.y - replicaRadius"
          stroke="var(--color-border)"
          stroke-width="1.5"
          stroke-dasharray="4 3"
        />

        <!-- Master nodes -->
        <g
          v-for="(master, index) in masters"
          :key="`master-${master.id}`"
          class="cursor-pointer"
          @mouseenter="hoveredNode = master.id"
          @mouseleave="hoveredNode = null"
        >
          <circle
            :cx="masterX(index)"
            :cy="masterY"
            :r="masterRadius"
            :fill="nodeColor(master)"
            fill-opacity="0.2"
            :stroke="nodeStroke(master)"
            stroke-width="2"
          />
          <circle
            :cx="masterX(index)"
            :cy="masterY"
            :r="masterRadius - 6"
            :fill="nodeColor(master)"
            fill-opacity="0.4"
          />
          <!-- M label -->
          <text
            :x="masterX(index)"
            :y="masterY + 1"
            text-anchor="middle"
            dominant-baseline="central"
            fill="var(--color-text)"
            font-size="11"
            font-weight="600"
          >
            M
          </text>
          <!-- Address label -->
          <text
            :x="masterX(index)"
            :y="masterY - masterRadius - 10"
            text-anchor="middle"
            fill="var(--color-chart-text-subtle)"
            font-size="10"
            font-family="monospace"
          >
            {{ formatAddress(master.address) }}
          </text>
        </g>

        <!-- Replica nodes -->
        <g
          v-for="rp in replicaPositions"
          :key="`replica-${rp.node.id}`"
          class="cursor-pointer"
          @mouseenter="hoveredNode = rp.node.id"
          @mouseleave="hoveredNode = null"
        >
          <circle
            :cx="rp.x"
            :cy="rp.y"
            :r="replicaRadius"
            :fill="nodeColor(rp.node)"
            fill-opacity="0.2"
            :stroke="nodeStroke(rp.node)"
            stroke-width="1.5"
          />
          <circle
            :cx="rp.x"
            :cy="rp.y"
            :r="replicaRadius - 4"
            :fill="nodeColor(rp.node)"
            fill-opacity="0.4"
          />
          <!-- R label -->
          <text
            :x="rp.x"
            :y="rp.y + 1"
            text-anchor="middle"
            dominant-baseline="central"
            fill="var(--color-text)"
            font-size="9"
            font-weight="500"
          >
            R
          </text>
          <!-- Address label -->
          <text
            :x="rp.x"
            :y="rp.y + replicaRadius + 14"
            text-anchor="middle"
            fill="var(--color-chart-text-muted)"
            font-size="9"
            font-family="monospace"
          >
            {{ formatAddress(rp.node.address) }}
          </text>
        </g>

        <!-- Legend -->
        <g transform="translate(10, 10)">
          <circle cx="6" cy="6" r="5" :fill="getColors().blue" fill-opacity="0.4" :stroke="getColors().sky" stroke-width="1" />
          <text x="16" y="10" fill="var(--color-chart-text-muted)" font-size="9">Master</text>
          <circle cx="66" cy="6" r="4" :fill="getColors().green" fill-opacity="0.4" :stroke="getColors().teal" stroke-width="1" />
          <text x="74" y="10" fill="var(--color-chart-text-muted)" font-size="9">Replica</text>
        </g>
      </svg>
    </div>

    <!-- Hover tooltip (positioned below SVG) -->
    <div
      v-if="hoveredNodeData"
      class="mx-4 mb-4 p-3 bg-surface-0 border border-border rounded-lg text-xs space-y-1 max-w-sm"
    >
      <div class="flex items-center gap-2 mb-2">
        <span
          class="px-1.5 py-0.5 text-xs font-medium rounded"
          :class="hoveredNodeData.role === 'master' ? 'bg-accent-muted text-accent' : 'bg-success-muted text-success'"
        >
          {{ hoveredNodeData.role }}
        </span>
        <span class="font-mono text-text">{{ hoveredNodeData.address }}</span>
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span class="text-text-muted">Node ID:</span>
        <span class="font-mono text-text-secondary truncate" :title="hoveredNodeData.id">{{ hoveredNodeData.id }}</span>
        <span class="text-text-muted">Link State:</span>
        <span :class="hoveredNodeData.linkState === 'connected' ? 'text-success' : 'text-danger'">
          {{ hoveredNodeData.linkState }}
        </span>
        <span class="text-text-muted">Config Epoch:</span>
        <span class="text-text tabular-nums">{{ hoveredNodeData.configEpoch }}</span>
        <span class="text-text-muted">Flags:</span>
        <span class="text-text">{{ hoveredNodeData.flags.join(', ') }}</span>
        <template v-if="hoveredNodeData.slots.length > 0">
          <span class="text-text-muted">Slots:</span>
          <span class="text-text font-mono">{{ hoveredNodeData.slots.join(', ') }}</span>
        </template>
        <template v-if="hoveredNodeData.master">
          <span class="text-text-muted">Master:</span>
          <span class="font-mono text-text-secondary truncate" :title="hoveredNodeData.master">{{ hoveredNodeData.master }}</span>
        </template>
      </div>
    </div>
  </div>
</template>
