<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    items: unknown[]
    itemHeight: number
    overscan?: number
  }>(),
  {
    overscan: 5
  }
)

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight) - props.overscan
  return Math.max(0, start)
})

const endIndex = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight)
  const end = Math.floor(scrollTop.value / props.itemHeight) + visibleCount + props.overscan
  return Math.min(props.items.length - 1, end)
})

const visibleItems = computed(() => {
  const result: Array<{ item: unknown; index: number }> = []
  for (let i = startIndex.value; i <= endIndex.value; i++) {
    result.push({ item: props.items[i], index: i })
  }
  return result
})

const offsetY = computed(() => startIndex.value * props.itemHeight)

function onScroll(): void {
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <div
    ref="containerRef"
    class="h-full overflow-y-auto"
    @scroll="onScroll"
  >
    <!-- Spacer to maintain total scroll height -->
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <!-- Rendered items positioned via transform -->
      <div
        :style="{
          transform: `translateY(${offsetY}px)`,
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0
        }"
      >
        <div
          v-for="{ item, index } in visibleItems"
          :key="index"
          :style="{ height: `${itemHeight}px` }"
        >
          <slot :item="item" :index="index" />
        </div>
      </div>
    </div>
  </div>
</template>
