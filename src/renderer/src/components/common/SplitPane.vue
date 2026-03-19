<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    direction?: 'horizontal' | 'vertical'
    initialSize?: number
    minSize?: number
    maxSize?: number
  }>(),
  {
    direction: 'horizontal',
    initialSize: 250,
    minSize: 100,
    maxSize: 800
  }
)

const emit = defineEmits<{
  (e: 'resize', size: number): void
}>()

const currentSize = ref(props.initialSize)
const isDragging = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const isHorizontal = computed(() => props.direction === 'horizontal')

const dividerCursor = computed(() => (isHorizontal.value ? 'col-resize' : 'row-resize'))

const firstPaneStyle = computed(() => {
  if (isHorizontal.value) {
    return { width: `${currentSize.value}px`, minWidth: `${props.minSize}px` }
  }
  return { height: `${currentSize.value}px`, minHeight: `${props.minSize}px` }
})

function onMouseDown(event: MouseEvent): void {
  event.preventDefault()
  isDragging.value = true
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = dividerCursor.value
  document.body.style.userSelect = 'none'
}

function onMouseMove(event: MouseEvent): void {
  if (!isDragging.value || !containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  let newSize: number

  if (isHorizontal.value) {
    newSize = event.clientX - rect.left
  } else {
    newSize = event.clientY - rect.top
  }

  newSize = Math.max(props.minSize, Math.min(props.maxSize, newSize))
  currentSize.value = newSize
  emit('resize', newSize)
}

function onMouseUp(): void {
  isDragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div
    ref="containerRef"
    class="flex overflow-hidden"
    :class="isHorizontal ? 'flex-row h-full' : 'flex-col w-full'"
  >
    <!-- First pane -->
    <div class="overflow-hidden shrink-0" :style="firstPaneStyle">
      <slot name="first" />
    </div>

    <!-- Divider -->
    <div
      class="shrink-0 transition-colors duration-100"
      :class="[
        isHorizontal ? 'w-1 h-full hover:bg-accent/30' : 'h-1 w-full hover:bg-accent/30',
        isDragging ? 'bg-accent/40' : 'bg-border'
      ]"
      :style="{ cursor: dividerCursor }"
      @mousedown="onMouseDown"
    />

    <!-- Second pane -->
    <div class="flex-1 overflow-hidden min-w-0 min-h-0">
      <slot name="second" />
    </div>
  </div>
</template>
