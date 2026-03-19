import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

export interface VirtualScrollOptions<T> {
  items: Ref<T[]>
  itemHeight: number
  overscan?: number
}

export function useVirtualScroll<T>(options: VirtualScrollOptions<T>) {
  const { items, itemHeight, overscan = 5 } = options

  const containerRef = ref<HTMLElement | null>(null)
  const scrollTop = ref(0)
  const containerHeight = ref(0)

  const totalHeight = computed(() => items.value.length * itemHeight)

  const startIndex = computed(() => {
    const start = Math.floor(scrollTop.value / itemHeight) - overscan
    return Math.max(0, start)
  })

  const endIndex = computed(() => {
    const visibleCount = Math.ceil(containerHeight.value / itemHeight)
    const end = Math.floor(scrollTop.value / itemHeight) + visibleCount + overscan
    return Math.min(items.value.length, end)
  })

  const visibleItems = computed(() => {
    return items.value.slice(startIndex.value, endIndex.value).map((item, i) => ({
      item,
      index: startIndex.value + i
    }))
  })

  const offsetY = computed(() => startIndex.value * itemHeight)

  function onScroll(event: Event): void {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
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
    resizeObserver?.disconnect()
  })

  function scrollToIndex(index: number): void {
    if (containerRef.value) {
      containerRef.value.scrollTop = index * itemHeight
    }
  }

  function scrollToBottom(): void {
    if (containerRef.value) {
      containerRef.value.scrollTop = totalHeight.value
    }
  }

  return {
    containerRef,
    totalHeight,
    visibleItems,
    offsetY,
    startIndex,
    endIndex,
    onScroll,
    scrollToIndex,
    scrollToBottom
  }
}
