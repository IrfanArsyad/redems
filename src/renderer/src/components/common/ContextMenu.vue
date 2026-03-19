<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

export interface ContextMenuItem {
  label: string
  icon?: string
  shortcut?: string
  action?: () => void
  separator?: boolean
  disabled?: boolean
  danger?: boolean
}

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', item: ContextMenuItem): void
}>()

const menuRef = ref<HTMLElement | null>(null)
const focusedIndex = ref(-1)

const adjustedPosition = computed(() => {
  if (!menuRef.value) {
    return { left: `${props.x}px`, top: `${props.y}px` }
  }

  const rect = menuRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = props.x
  let top = props.y

  if (left + rect.width > viewportWidth) {
    left = viewportWidth - rect.width - 4
  }
  if (top + rect.height > viewportHeight) {
    top = viewportHeight - rect.height - 4
  }

  left = Math.max(4, left)
  top = Math.max(4, top)

  return { left: `${left}px`, top: `${top}px` }
})

const actionableItems = computed(() =>
  props.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.separator && !item.disabled)
)

function handleSelect(item: ContextMenuItem): void {
  if (item.disabled || item.separator) return
  emit('select', item)
  if (item.action) {
    item.action()
  }
  emit('close')
}

function onClickOutside(event: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.visible) return

  switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault()
      const currentIdx = actionableItems.value.findIndex(
        ({ index }) => index === focusedIndex.value
      )
      const nextIdx = currentIdx < actionableItems.value.length - 1 ? currentIdx + 1 : 0
      focusedIndex.value = actionableItems.value[nextIdx]?.index ?? -1
      break
    }
    case 'ArrowUp': {
      event.preventDefault()
      const currentIdx = actionableItems.value.findIndex(
        ({ index }) => index === focusedIndex.value
      )
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : actionableItems.value.length - 1
      focusedIndex.value = actionableItems.value[prevIdx]?.index ?? -1
      break
    }
    case 'Enter': {
      event.preventDefault()
      if (focusedIndex.value >= 0) {
        const item = props.items[focusedIndex.value]
        if (item && !item.disabled && !item.separator) {
          handleSelect(item)
        }
      }
      break
    }
    case 'Escape':
      event.preventDefault()
      emit('close')
      break
  }
}

watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      focusedIndex.value = -1
      await nextTick()
      document.addEventListener('mousedown', onClickOutside)
      document.addEventListener('keydown', onKeydown)
    } else {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ctx">
      <div
        v-if="visible"
        ref="menuRef"
        class="fixed z-[200] min-w-[180px] max-w-[280px] py-1.5 bg-surface-1 border border-border rounded-xl shadow-xl backdrop-blur-xl"
        :style="adjustedPosition"
      >
        <template v-for="(item, index) in items" :key="index">
          <!-- Separator -->
          <div
            v-if="item.separator"
            class="my-1.5 mx-3 border-t border-border"
          />

          <!-- Menu item -->
          <div
            v-else
            class="flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg cursor-pointer select-none transition-all duration-75"
            :class="[
              item.disabled
                ? 'opacity-30 cursor-not-allowed'
                : focusedIndex === index
                  ? item.danger
                    ? 'bg-danger-muted text-danger'
                    : 'bg-accent-muted text-accent'
                  : item.danger
                    ? 'text-danger hover:bg-danger-muted'
                    : 'text-text-secondary hover:bg-overlay-0/50 hover:text-text'
            ]"
            @click="handleSelect(item)"
            @mouseenter="focusedIndex = item.disabled ? -1 : index"
          >
            <!-- Label -->
            <span class="flex-1 text-xs font-medium">{{ item.label }}</span>

            <!-- Shortcut -->
            <span
              v-if="item.shortcut"
              class="text-xs text-text-faint ml-4 shrink-0 font-mono"
            >
              {{ item.shortcut }}
            </span>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ctx-enter-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.ctx-leave-active {
  transition: opacity 0.08s ease, transform 0.08s ease;
}

.ctx-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(-2px);
}

.ctx-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-2px);
}
</style>
