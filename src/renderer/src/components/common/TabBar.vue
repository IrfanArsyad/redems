<script setup lang="ts">
import { type Component } from 'vue'
import type { Tab } from '@renderer/stores/ui.store'
import {
  Key,
  Terminal,
  Activity,
  Radio,
  Server,
  Network,
  Settings,
  FileText,
  X,
  Plus
} from 'lucide-vue-next'

defineProps<{
  tabs: Tab[]
  activeTabId: string | null
}>()

const emit = defineEmits<{
  (e: 'tab-select', tabId: string): void
  (e: 'tab-close', tabId: string): void
  (e: 'tab-add'): void
}>()

function getTabIcon(type: string): Component {
  switch (type) {
    case 'keys':
      return Key
    case 'cli':
      return Terminal
    case 'monitor':
      return Activity
    case 'pubsub':
      return Radio
    case 'server':
      return Server
    case 'cluster':
      return Network
    case 'settings':
      return Settings
    default:
      return FileText
  }
}

function handleMiddleClick(event: MouseEvent, tabId: string): void {
  if (event.button === 1) {
    event.preventDefault()
    emit('tab-close', tabId)
  }
}

let draggedTabId: string | null = null

function onDragStart(event: DragEvent, tabId: string): void {
  draggedTabId = tabId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', tabId)
  }
}

function onDragOver(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDrop(event: DragEvent, _targetTabId: string): void {
  event.preventDefault()
  draggedTabId = null
}

function onDragEnd(): void {
  draggedTabId = null
}
</script>

<template>
  <div class="flex items-stretch h-9 bg-crust border-b border-border overflow-hidden">
    <!-- Tab scroll container -->
    <div class="flex-1 flex items-stretch overflow-x-auto scrollbar-none min-w-0">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="group relative flex items-center gap-2 px-4 min-w-[120px] max-w-[200px] cursor-pointer select-none shrink-0 transition-all duration-150 border-r border-border/50"
        :class="[
          activeTabId === tab.id
            ? 'bg-base text-text'
            : 'text-text-muted hover:text-text-secondary hover:bg-surface-0/30'
        ]"
        :draggable="true"
        @click="emit('tab-select', tab.id)"
        @mousedown="handleMiddleClick($event, tab.id)"
        @dragstart="onDragStart($event, tab.id)"
        @dragover="onDragOver($event)"
        @drop="onDrop($event, tab.id)"
        @dragend="onDragEnd"
      >
        <!-- Active indicator -->
        <div
          v-if="activeTabId === tab.id"
          class="absolute top-0 left-0 right-0 h-[2px] bg-accent rounded-b"
        />

        <!-- Tab icon -->
        <component
          :is="getTabIcon(tab.type)"
          class="w-3.5 h-3.5 shrink-0"
          :class="activeTabId === tab.id ? 'text-accent' : ''"
          :stroke-width="1.75"
        />

        <!-- Tab title -->
        <span class="text-xs truncate flex-1 font-medium">{{ tab.title }}</span>

        <!-- Close button -->
        <button
          class="flex items-center justify-center w-5 h-5 rounded-md shrink-0 transition-all duration-100"
          :class="[
            activeTabId === tab.id
              ? 'text-text-muted hover:text-text hover:bg-overlay-0'
              : 'opacity-0 group-hover:opacity-100 text-text-faint hover:text-text hover:bg-overlay-0'
          ]"
          @click.stop="emit('tab-close', tab.id)"
          title="Close tab"
        >
          <X class="w-3 h-3" :stroke-width="2" />
        </button>
      </div>
    </div>

    <!-- New tab button -->
    <button
      class="flex items-center justify-center w-9 shrink-0 text-text-faint hover:text-text-muted hover:bg-surface-0/30 transition-colors duration-150"
      @click="emit('tab-add')"
      title="New tab"
    >
      <Plus class="w-3.5 h-3.5" :stroke-width="2" />
    </button>
  </div>
</template>
