<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useKeysStore } from '@renderer/stores/keys.store'
import KeyToolbar from './KeyToolbar.vue'
import KeyTree from './KeyTree.vue'
import KeyList from './KeyList.vue'
import KeyDetail from './KeyDetail.vue'
import { ref } from 'vue'

const props = defineProps<{
  connectionId: string
}>()

const keysStore = useKeysStore()

// Split pane state
const splitPosition = ref<number>(320)
const isDragging = ref(false)

function startResize(e: MouseEvent): void {
  isDragging.value = true
  const startX = e.clientX
  const startWidth = splitPosition.value

  const onMouseMove = (ev: MouseEvent): void => {
    const delta = ev.clientX - startX
    const newWidth = startWidth + delta
    splitPosition.value = Math.max(220, Math.min(600, newWidth))
  }

  const onMouseUp = (): void => {
    isDragging.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

onMounted(async () => {
  await keysStore.scanKeys(props.connectionId, true)
})

watch(
  () => props.connectionId,
  async (newId) => {
    keysStore.clearKeys()
    await keysStore.scanKeys(newId, true)
  }
)
</script>

<template>
  <div class="flex flex-col h-full bg-base text-text">
    <!-- Toolbar -->
    <KeyToolbar :connection-id="connectionId" />

    <!-- Main content: left panel + right panel -->
    <div class="flex flex-1 min-h-0">
      <!-- Left panel: key tree or list -->
      <div
        class="flex flex-col border-r border-border overflow-hidden bg-mantle"
        :style="{ width: splitPosition + 'px', minWidth: '220px' }"
      >
        <KeyTree
          v-if="keysStore.viewMode === 'tree'"
          :connection-id="connectionId"
          :keys="keysStore.filteredKeys"
        />
        <KeyList
          v-else
          :connection-id="connectionId"
          :keys="keysStore.filteredKeys"
        />
      </div>

      <!-- Resize handle -->
      <div
        class="relative w-0 cursor-col-resize group/split z-10"
        @mousedown="startResize"
      >
        <div
          class="absolute -left-[1px] top-0 h-full w-[2px] transition-all duration-200"
          :class="isDragging ? 'bg-accent' : 'bg-transparent group-hover/split:bg-accent/40'"
        />
      </div>

      <!-- Right panel: key detail -->
      <div class="flex-1 min-w-0 overflow-hidden">
        <KeyDetail :connection-id="connectionId" />
      </div>
    </div>
  </div>
</template>
