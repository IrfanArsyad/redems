<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useKeysStore } from '@renderer/stores/keys.store'
import { useSettingsStore } from '@renderer/stores/settings.store'
import { useUiStore } from '@renderer/stores/ui.store'
import type { RedisKeyInfo } from '@shared/types/redis.types'
import { ChevronRight, Folder, FolderOpen, Key, KeyRound } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
  keys: RedisKeyInfo[]
}>()

const keysStore = useKeysStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()

interface TreeNode {
  name: string
  fullPath: string
  isLeaf: boolean
  type?: string
  ttl?: number
  children: Map<string, TreeNode>
  keyCount: number
  expanded: boolean
}

const expandedNodes = ref<Set<string>>(new Set())
const scrollContainer = ref<HTMLElement | null>(null)

// Visible range for virtual scrolling
const scrollTop = ref(0)
const containerHeight = ref(400)
const itemHeight = 30

const typeBadgeColors: Record<string, string> = {
  string: 'bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/20',
  hash: 'bg-sky-500/12 text-sky-400 ring-1 ring-sky-500/20',
  list: 'bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/20',
  set: 'bg-violet-500/12 text-violet-400 ring-1 ring-violet-500/20',
  zset: 'bg-rose-500/12 text-rose-400 ring-1 ring-rose-500/20',
  stream: 'bg-cyan-500/12 text-cyan-400 ring-1 ring-cyan-500/20',
  unknown: 'bg-gray-500/12 text-gray-400 ring-1 ring-gray-500/20'
}

function buildTree(keyList: RedisKeyInfo[]): TreeNode {
  const root: TreeNode = {
    name: '',
    fullPath: '',
    isLeaf: false,
    children: new Map(),
    keyCount: 0,
    expanded: true
  }

  const sep = settingsStore.keySeparator

  for (const keyInfo of keyList) {
    const parts = keyInfo.key.split(sep)
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const path = parts.slice(0, i + 1).join(sep)

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath: path,
          isLeaf: isLast,
          type: isLast ? keyInfo.type : undefined,
          ttl: isLast ? keyInfo.ttl : undefined,
          children: new Map(),
          keyCount: 0,
          expanded: expandedNodes.value.has(path)
        })
      }

      const node = current.children.get(part)!
      if (isLast) {
        node.isLeaf = true
        node.type = keyInfo.type
        node.ttl = keyInfo.ttl
      }
      current.keyCount++
      current = node
    }
  }

  return root
}

const tree = computed(() => buildTree(props.keys))

interface FlatNode {
  node: TreeNode
  depth: number
  key: string
}

function flattenTree(node: TreeNode, depth: number = 0): FlatNode[] {
  const result: FlatNode[] = []

  const sorted = Array.from(node.children.values()).sort((a, b) => {
    if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1
    return a.name.localeCompare(b.name)
  })

  for (const child of sorted) {
    result.push({ node: child, depth, key: child.fullPath })

    if (!child.isLeaf && expandedNodes.value.has(child.fullPath)) {
      result.push(...flattenTree(child, depth + 1))
    }
  }

  return result
}

const flatNodes = computed(() => flattenTree(tree.value))

// Virtual scroll computed values
const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / itemHeight)
  const visibleCount = Math.ceil(containerHeight.value / itemHeight) + 2
  return {
    start: Math.max(0, start - 1),
    end: Math.min(flatNodes.value.length, start + visibleCount)
  }
})

const visibleNodes = computed(() => {
  return flatNodes.value.slice(visibleRange.value.start, visibleRange.value.end)
})

const totalHeight = computed(() => flatNodes.value.length * itemHeight)
const offsetY = computed(() => visibleRange.value.start * itemHeight)

function onScroll(e: Event): void {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
  containerHeight.value = target.clientHeight
}

function toggleExpand(node: TreeNode): void {
  if (node.isLeaf) return
  if (expandedNodes.value.has(node.fullPath)) {
    expandedNodes.value.delete(node.fullPath)
  } else {
    expandedNodes.value.add(node.fullPath)
    const sep = settingsStore.keySeparator
    const prefixPattern = node.fullPath + sep + '*'
    keysStore.setSearchPattern(prefixPattern)
    keysStore.scanKeys(props.connectionId, false).then(() => {
      keysStore.setSearchPattern('*')
    })
  }
}

function onSelectKey(node: TreeNode): void {
  if (!node.isLeaf) {
    toggleExpand(node)
    return
  }
  keysStore.selectKey(props.connectionId, node.fullPath)
}

function onContextMenu(e: MouseEvent, node: TreeNode): void {
  if (!node.isLeaf) return
  e.preventDefault()
  uiStore.showContextMenu(e.clientX, e.clientY, [
    {
      label: 'Copy Key Name',
      icon: 'copy',
      action: () => navigator.clipboard.writeText(node.fullPath)
    },
    {
      label: 'Rename',
      icon: 'edit',
      action: () => {
        const newName = prompt('Rename key:', node.fullPath)
        if (newName && newName !== node.fullPath) {
          keysStore.renameKey(props.connectionId, node.fullPath, newName)
        }
      }
    },
    {
      label: 'Set TTL',
      icon: 'clock',
      action: () => {
        const ttl = prompt('Set TTL (seconds, -1 to persist):', String(node.ttl ?? -1))
        if (ttl !== null) {
          keysStore.setExpiry(props.connectionId, node.fullPath, parseInt(ttl))
        }
      }
    },
    { label: '', action: () => {}, separator: true },
    {
      label: 'Delete',
      icon: 'trash',
      danger: true,
      action: () => {
        if (confirm(`Delete key "${node.fullPath}"?`)) {
          keysStore.deleteKeys(props.connectionId, [node.fullPath])
        }
      }
    }
  ])
}

function formatTtl(ttl: number | undefined): string {
  if (ttl === undefined || ttl === -1) return ''
  if (ttl === -2) return 'expired'
  if (ttl < 60) return `${ttl}s`
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m`
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h`
  return `${Math.floor(ttl / 86400)}d`
}

function getFolderKeyCount(node: TreeNode): number {
  if (node.isLeaf) return 0
  let count = 0
  function walk(n: TreeNode): void {
    for (const child of n.children.values()) {
      if (child.isLeaf) count++
      else walk(child)
    }
  }
  walk(node)
  return count
}

watch(
  () => scrollContainer.value,
  (el) => {
    if (el) {
      containerHeight.value = el.clientHeight
    }
  }
)
</script>

<template>
  <div
    ref="scrollContainer"
    class="flex-1 overflow-auto scrollbar-thin"
    @scroll="onScroll"
  >
    <!-- Virtual scroll container -->
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <div :style="{ transform: `translateY(${offsetY}px)` }">
        <div
          v-for="item in visibleNodes"
          :key="item.key"
          class="flex items-center px-2 cursor-pointer text-xs select-none group transition-colors duration-100"
          :class="{
            'bg-accent-muted text-accent': keysStore.activeKey === item.node.fullPath,
            'hover:bg-overlay-0/30 text-text-secondary hover:text-text': keysStore.activeKey !== item.node.fullPath
          }"
          :style="{ paddingLeft: (item.depth * 16 + 8) + 'px', height: itemHeight + 'px' }"
          @click="onSelectKey(item.node)"
          @contextmenu="onContextMenu($event, item.node)"
        >
          <!-- Expand/collapse chevron for folders -->
          <span
            v-if="!item.node.isLeaf"
            class="flex items-center justify-center w-4 h-4 mr-1 flex-shrink-0 transition-transform duration-150"
            :class="{ 'rotate-90': expandedNodes.has(item.node.fullPath) }"
          >
            <ChevronRight class="w-3 h-3 text-text-faint" />
          </span>

          <!-- Folder icon -->
          <FolderOpen
            v-if="!item.node.isLeaf && expandedNodes.has(item.node.fullPath)"
            class="w-4 h-4 mr-1.5 flex-shrink-0 text-accent/70"
          />
          <Folder
            v-else-if="!item.node.isLeaf"
            class="w-4 h-4 mr-1.5 flex-shrink-0 text-text-muted"
          />

          <!-- Key icon for leaves -->
          <Key
            v-else
            class="w-3.5 h-3.5 mr-1.5 ml-4 flex-shrink-0 text-text-faint"
          />

          <!-- Name -->
          <span class="truncate flex-1 mr-2">
            {{ item.node.name }}
          </span>

          <!-- Type badge for leaves -->
          <span
            v-if="item.node.isLeaf && item.node.type"
            class="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider mr-1"
            :class="typeBadgeColors[item.node.type] || typeBadgeColors.unknown"
          >
            {{ item.node.type }}
          </span>

          <!-- TTL for leaves -->
          <span
            v-if="item.node.isLeaf && item.node.ttl !== undefined && item.node.ttl > 0"
            class="flex-shrink-0 text-xs text-text-faint tabular-nums mr-1"
          >
            {{ formatTtl(item.node.ttl) }}
          </span>

          <!-- Key count badge for folders -->
          <span
            v-if="!item.node.isLeaf"
            class="flex-shrink-0 px-1.5 py-0.5 rounded-full text-xs bg-overlay-0/60 text-text-faint tabular-nums"
          >
            {{ getFolderKeyCount(item.node) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Load more button -->
    <div
      v-if="keysStore.hasMore"
      class="flex items-center justify-center py-3"
    >
      <button
        class="text-xs text-accent hover:text-accent-hover transition-colors px-4 py-1.5 rounded-md hover:bg-accent-subtle"
        :disabled="keysStore.loading"
        @click="keysStore.loadMore(connectionId)"
      >
        {{ keysStore.loading ? 'Loading...' : 'Load More' }}
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-if="!keysStore.loading && keys.length === 0"
      class="flex flex-col items-center justify-center py-16 text-text-muted"
    >
      <KeyRound class="w-10 h-10 mb-3 text-text-faint" :stroke-width="1.25" />
      <span class="text-xs font-medium">No keys found</span>
      <span class="text-xs text-text-faint mt-1">Try a different search pattern</span>
    </div>
  </div>
</template>
