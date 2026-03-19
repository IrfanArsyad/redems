<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RedisClusterNode } from '@shared/types/redis.types'
import { useChartTheme } from '@renderer/composables/useChartTheme'

const props = defineProps<{
  nodes: RedisClusterNode[]
}>()

const { palette } = useChartTheme()
const hoveredSegment = ref<{ node: RedisClusterNode; range: string; start: number; end: number } | null>(null)

const TOTAL_SLOTS = 16384

const nodeColors = computed(() => palette())

const masters = computed(() =>
  props.nodes.filter((n) => n.role === 'master')
)

interface SlotSegment {
  node: RedisClusterNode
  start: number
  end: number
  color: string
  range: string
}

const segments = computed<SlotSegment[]>(() => {
  const result: SlotSegment[] = []
  const colorMap = new Map<string, string>()

  // Assign colors to masters
  masters.value.forEach((m, i) => {
    colorMap.set(m.id, nodeColors.value[i % nodeColors.value.length])
  })

  // Parse slot ranges from each master node
  for (const master of masters.value) {
    const color = colorMap.get(master.id) || '#6c7086'
    for (const slotRange of master.slots) {
      const parts = slotRange.split('-')
      const start = parseInt(parts[0], 10)
      const end = parts.length > 1 ? parseInt(parts[1], 10) : start

      if (!isNaN(start) && !isNaN(end)) {
        result.push({
          node: master,
          start,
          end,
          color,
          range: slotRange
        })
      }
    }
  }

  // Sort by start position
  result.sort((a, b) => a.start - b.start)
  return result
})

// Detect gaps (unassigned slots)
const gaps = computed<Array<{ start: number; end: number }>>(() => {
  const gapList: Array<{ start: number; end: number }> = []
  if (segments.value.length === 0) {
    gapList.push({ start: 0, end: TOTAL_SLOTS - 1 })
    return gapList
  }

  // Check gap before first segment
  if (segments.value[0].start > 0) {
    gapList.push({ start: 0, end: segments.value[0].start - 1 })
  }

  // Check gaps between segments
  for (let i = 0; i < segments.value.length - 1; i++) {
    const currentEnd = segments.value[i].end
    const nextStart = segments.value[i + 1].start
    if (nextStart > currentEnd + 1) {
      gapList.push({ start: currentEnd + 1, end: nextStart - 1 })
    }
  }

  // Check gap after last segment
  const last = segments.value[segments.value.length - 1]
  if (last.end < TOTAL_SLOTS - 1) {
    gapList.push({ start: last.end + 1, end: TOTAL_SLOTS - 1 })
  }

  return gapList
})

function segmentWidth(start: number, end: number): string {
  const count = end - start + 1
  return `${(count / TOTAL_SLOTS) * 100}%`
}

function segmentLeft(start: number): string {
  return `${(start / TOTAL_SLOTS) * 100}%`
}

// Legend entries: unique master -> color mapping
const legendEntries = computed(() => {
  const map = new Map<string, { address: string; color: string; slots: string[] }>()
  for (const seg of segments.value) {
    if (!map.has(seg.node.id)) {
      map.set(seg.node.id, {
        address: seg.node.address,
        color: seg.color,
        slots: []
      })
    }
    map.get(seg.node.id)!.slots.push(seg.range)
  }
  return Array.from(map.values())
})
</script>

<template>
  <div class="flex flex-col h-full bg-base overflow-auto">
    <!-- Empty state -->
    <div
      v-if="nodes.length === 0"
      class="flex flex-col items-center justify-center h-full text-text-muted"
    >
      <span class="text-xs">No cluster node data available</span>
    </div>

    <div v-else class="p-4 space-y-4">
      <!-- Title -->
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-text">Slot Distribution</span>
        <span class="text-xs text-text-muted">({{ TOTAL_SLOTS.toLocaleString() }} total slots)</span>
      </div>

      <!-- Slot Bar -->
      <div class="relative bg-overlay-0/30 rounded-lg h-10 border border-border overflow-hidden">
        <!-- Assigned segments -->
        <div
          v-for="(seg, index) in segments"
          :key="`seg-${index}`"
          class="absolute top-0 h-full cursor-pointer transition-opacity"
          :style="{
            left: segmentLeft(seg.start),
            width: segmentWidth(seg.start, seg.end),
            backgroundColor: seg.color,
            opacity: hoveredSegment && hoveredSegment.node.id !== seg.node.id ? 0.3 : 0.7
          }"
          @mouseenter="hoveredSegment = { node: seg.node, range: seg.range, start: seg.start, end: seg.end }"
          @mouseleave="hoveredSegment = null"
        />

        <!-- Gap segments (missing/unassigned) -->
        <div
          v-for="(gap, index) in gaps"
          :key="`gap-${index}`"
          class="absolute top-0 h-full cursor-pointer"
          :style="{
            left: segmentLeft(gap.start),
            width: segmentWidth(gap.start, gap.end),
            backgroundColor: 'var(--color-danger)',
            opacity: 0.25
          }"
          :title="`Unassigned: ${gap.start}-${gap.end}`"
        >
          <!-- Striped pattern for gaps -->
          <div class="w-full h-full" style="background: repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(243, 139, 168, 0.15) 3px, rgba(243, 139, 168, 0.15) 6px)" />
        </div>
      </div>

      <!-- Slot bar scale -->
      <div class="flex items-center justify-between px-0.5">
        <span class="text-xs text-text-muted tabular-nums">0</span>
        <span class="text-xs text-text-muted tabular-nums">4096</span>
        <span class="text-xs text-text-muted tabular-nums">8192</span>
        <span class="text-xs text-text-muted tabular-nums">12288</span>
        <span class="text-xs text-text-muted tabular-nums">16383</span>
      </div>

      <!-- Hover info -->
      <div
        v-if="hoveredSegment"
        class="bg-surface-0 border border-border rounded-lg p-3 text-xs"
      >
        <div class="flex items-center gap-2 mb-1">
          <span
            class="w-3 h-3 rounded-sm"
            :style="{ backgroundColor: segments.find(s => s.node.id === hoveredSegment!.node.id)?.color }"
          />
          <span class="font-mono text-text">{{ hoveredSegment.node.address }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs ml-5">
          <span class="text-text-muted">Slot Range:</span>
          <span class="text-text font-mono">{{ hoveredSegment.start }} - {{ hoveredSegment.end }}</span>
          <span class="text-text-muted">Slot Count:</span>
          <span class="text-text tabular-nums">{{ (hoveredSegment.end - hoveredSegment.start + 1).toLocaleString() }}</span>
          <span class="text-text-muted">Coverage:</span>
          <span class="text-text tabular-nums">
            {{ ((hoveredSegment.end - hoveredSegment.start + 1) / TOTAL_SLOTS * 100).toFixed(1) }}%
          </span>
        </div>
      </div>

      <!-- Legend -->
      <div class="bg-surface-0 border border-border rounded-lg overflow-hidden">
        <div class="px-4 py-2 border-b border-border">
          <span class="text-xs font-medium text-text">Node Legend</span>
        </div>
        <div class="p-3 space-y-2">
          <div
            v-for="entry in legendEntries"
            :key="entry.address"
            class="flex items-center gap-2"
          >
            <span
              class="w-4 h-4 rounded-sm shrink-0"
              :style="{ backgroundColor: entry.color, opacity: 0.7 }"
            />
            <span class="text-xs font-mono text-text">{{ entry.address }}</span>
            <span class="text-xs text-text-muted ml-2">
              {{ entry.slots.join(', ') }}
            </span>
          </div>

          <!-- Show gap legend if there are any -->
          <div v-if="gaps.length > 0" class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-sm shrink-0 bg-danger/25" style="background: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(243, 139, 168, 0.3) 2px, rgba(243, 139, 168, 0.3) 4px)" />
            <span class="text-xs text-danger">Unassigned</span>
            <span class="text-xs text-text-muted ml-2">
              {{ gaps.map(g => `${g.start}-${g.end}`).join(', ') }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
