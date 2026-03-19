<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useStreamStore } from '@renderer/stores/stream.store'
import { Plus, RefreshCw, Users, ChevronRight, Eye, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
  keyName: string
}>()

const streamStore = useStreamStore()
const expandedGroup = ref<string | null>(null)
const showCreateForm = ref<boolean>(false)
const showPending = ref<string | null>(null)
const selectedPendingIds = ref<Set<string>>(new Set())

// Create group form
const newGroupName = ref<string>('')
const newGroupStartId = ref<string>('$')

onMounted(async () => {
  await streamStore.fetchGroups(props.connectionId, props.keyName)
})

async function toggleExpandGroup(groupName: string): Promise<void> {
  if (expandedGroup.value === groupName) {
    expandedGroup.value = null
    return
  }
  expandedGroup.value = groupName
  await streamStore.fetchConsumers(props.connectionId, props.keyName, groupName)
}

async function viewPending(groupName: string): Promise<void> {
  if (showPending.value === groupName) {
    showPending.value = null
    return
  }
  showPending.value = groupName
  selectedPendingIds.value.clear()
  await streamStore.fetchPending(props.connectionId, props.keyName, groupName)
}

async function createGroup(): Promise<void> {
  const name = newGroupName.value.trim()
  if (!name) return
  await streamStore.createGroup(props.connectionId, props.keyName, name, newGroupStartId.value)
  newGroupName.value = ''
  newGroupStartId.value = '$'
  showCreateForm.value = false
}

async function destroyGroup(groupName: string): Promise<void> {
  if (!confirm(`Destroy consumer group "${groupName}"? This action cannot be undone.`)) return
  await streamStore.destroyGroup(props.connectionId, props.keyName, groupName)
  if (expandedGroup.value === groupName) {
    expandedGroup.value = null
  }
  if (showPending.value === groupName) {
    showPending.value = null
  }
}

function togglePendingSelection(id: string): void {
  if (selectedPendingIds.value.has(id)) {
    selectedPendingIds.value.delete(id)
  } else {
    selectedPendingIds.value.add(id)
  }
}

function selectAllPending(): void {
  if (selectedPendingIds.value.size === streamStore.pendingEntries.length) {
    selectedPendingIds.value.clear()
  } else {
    selectedPendingIds.value = new Set(streamStore.pendingEntries.map((e) => e.id))
  }
}

async function ackSelected(): Promise<void> {
  if (selectedPendingIds.value.size === 0 || !showPending.value) return
  const ids = Array.from(selectedPendingIds.value)
  await streamStore.ackEntries(props.connectionId, props.keyName, showPending.value, ids)
  selectedPendingIds.value.clear()
}

async function ackSingle(id: string): Promise<void> {
  if (!showPending.value) return
  await streamStore.ackEntries(props.connectionId, props.keyName, showPending.value, [id])
}

function formatIdleTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

// Reset state when key changes
watch(
  () => props.keyName,
  async () => {
    expandedGroup.value = null
    showPending.value = null
    selectedPendingIds.value.clear()
    await streamStore.fetchGroups(props.connectionId, props.keyName)
  }
)
</script>

<template>
  <div class="flex flex-col h-full bg-base">
    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface-0">
      <span class="text-xs font-medium text-text">Consumer Groups</span>
      <span class="text-xs text-text-muted">({{ streamStore.groups.length }})</span>
      <div class="flex-1" />

      <button
        class="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-success-muted text-success hover:bg-success/25 transition-colors"
        @click="showCreateForm = !showCreateForm"
      >
        <Plus class="w-3.5 h-3.5" :stroke-width="1.5" />
        Create Group
      </button>

      <button
        class="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text hover:bg-overlay-0/50 rounded transition-colors"
        @click="streamStore.fetchGroups(props.connectionId, props.keyName)"
      >
        <RefreshCw class="w-3.5 h-3.5" :stroke-width="1.5" />
      </button>
    </div>

    <!-- Create Group Form -->
    <div v-if="showCreateForm" class="p-3 border-b border-border bg-surface-0/50 space-y-2">
      <div class="flex items-center gap-2">
        <label class="text-xs text-text-muted w-16">Name:</label>
        <input
          v-model="newGroupName"
          type="text"
          placeholder="Group name"
          class="flex-1 px-2 py-1 text-xs bg-input-bg border border-border rounded text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          @keydown.enter="createGroup"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-text-muted w-16">Start ID:</label>
        <div class="flex items-center gap-2">
          <button
            class="px-2 py-0.5 text-xs rounded transition-colors"
            :class="newGroupStartId === '$' ? 'bg-accent-muted text-accent' : 'bg-overlay-0 text-text-muted hover:text-text'"
            @click="newGroupStartId = '$'"
          >
            $ (new messages)
          </button>
          <button
            class="px-2 py-0.5 text-xs rounded transition-colors"
            :class="newGroupStartId === '0' ? 'bg-accent-muted text-accent' : 'bg-overlay-0 text-text-muted hover:text-text'"
            @click="newGroupStartId = '0'"
          >
            0 (all messages)
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2 justify-end">
        <button
          class="px-3 py-1 text-xs text-text-muted hover:text-text rounded hover:bg-overlay-0/50 transition-colors"
          @click="showCreateForm = false"
        >
          Cancel
        </button>
        <button
          class="px-3 py-1 text-xs font-medium rounded bg-accent-muted text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
          :disabled="!newGroupName.trim()"
          @click="createGroup"
        >
          Create
        </button>
      </div>
    </div>

    <!-- Groups List -->
    <div class="flex-1 overflow-auto scrollbar-thin">
      <!-- Empty state -->
      <div
        v-if="streamStore.groups.length === 0 && !streamStore.loading"
        class="flex flex-col items-center justify-center h-full text-text-muted"
      >
        <Users class="w-10 h-10 mb-3 opacity-30" :stroke-width="1.5" />
        <span class="text-xs">No consumer groups. Create one to get started.</span>
      </div>

      <!-- Groups Table -->
      <table v-else class="w-full text-xs">
        <thead class="sticky top-0 bg-surface-0 z-10">
          <tr class="border-b border-border">
            <th class="text-left px-4 py-2 font-medium text-text-muted w-8" />
            <th class="text-left px-4 py-2 font-medium text-text-muted">Name</th>
            <th class="text-center px-4 py-2 font-medium text-text-muted">Consumers</th>
            <th class="text-center px-4 py-2 font-medium text-text-muted">Pending</th>
            <th class="text-left px-4 py-2 font-medium text-text-muted">Last Delivered ID</th>
            <th class="text-right px-4 py-2 font-medium text-text-muted w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in streamStore.groups" :key="group.name">
            <!-- Group row -->
            <tr
              class="border-b border-border/50 hover:bg-overlay-0/20 cursor-pointer"
              @click="toggleExpandGroup(group.name)"
            >
              <td class="px-4 py-2">
                <ChevronRight
                  class="w-3 h-3 text-text-muted transition-transform duration-150"
                  :class="{ 'rotate-90': expandedGroup === group.name }"
                  :stroke-width="1.5"
                />
              </td>
              <td class="px-4 py-2 font-medium text-text">{{ group.name }}</td>
              <td class="px-4 py-2 text-center tabular-nums">{{ group.consumers }}</td>
              <td class="px-4 py-2 text-center">
                <span
                  class="px-1.5 py-0.5 rounded tabular-nums"
                  :class="group.pending > 0 ? 'bg-warning-muted text-warning' : 'text-text-muted'"
                >
                  {{ group.pending }}
                </span>
              </td>
              <td class="px-4 py-2 font-mono text-text-muted">{{ group.lastDeliveredId }}</td>
              <td class="px-4 py-2 text-right">
                <div class="flex items-center gap-1 justify-end">
                  <button
                    class="p-1 text-text-muted hover:text-accent hover:bg-accent-subtle rounded transition-colors"
                    title="View pending"
                    @click.stop="viewPending(group.name)"
                  >
                    <Eye class="w-3.5 h-3.5" :stroke-width="1.5" />
                  </button>
                  <button
                    class="p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                    title="Destroy group"
                    @click.stop="destroyGroup(group.name)"
                  >
                    <Trash2 class="w-3.5 h-3.5" :stroke-width="1.5" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Expanded consumers -->
            <tr v-if="expandedGroup === group.name">
              <td colspan="6" class="bg-overlay-0/10 border-b border-border">
                <div class="px-8 py-2">
                  <div v-if="streamStore.consumers.length === 0" class="text-xs text-text-muted py-2">
                    No active consumers
                  </div>
                  <table v-else class="w-full text-xs">
                    <thead>
                      <tr class="border-b border-border/50">
                        <th class="text-left px-3 py-1.5 font-medium text-text-muted">Consumer</th>
                        <th class="text-center px-3 py-1.5 font-medium text-text-muted">Pending</th>
                        <th class="text-right px-3 py-1.5 font-medium text-text-muted">Idle</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="consumer in streamStore.consumers"
                        :key="consumer.name"
                        class="border-b border-border/30"
                      >
                        <td class="px-3 py-1.5 text-text font-mono">{{ consumer.name }}</td>
                        <td class="px-3 py-1.5 text-center tabular-nums">{{ consumer.pending }}</td>
                        <td class="px-3 py-1.5 text-right text-text-muted">{{ formatIdleTime(consumer.idle) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>

            <!-- Pending entries -->
            <tr v-if="showPending === group.name">
              <td colspan="6" class="bg-overlay-0/5 border-b border-border">
                <div class="px-4 py-2">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-xs font-medium text-text">Pending Entries</span>
                    <div class="flex-1" />
                    <button
                      v-if="selectedPendingIds.size > 0"
                      class="px-2 py-0.5 text-xs font-medium rounded bg-success-muted text-success hover:bg-success/25 transition-colors"
                      @click="ackSelected"
                    >
                      ACK Selected ({{ selectedPendingIds.size }})
                    </button>
                  </div>

                  <div v-if="streamStore.pendingEntries.length === 0" class="text-xs text-text-muted py-2">
                    No pending entries
                  </div>
                  <table v-else class="w-full text-xs">
                    <thead>
                      <tr class="border-b border-border/50">
                        <th class="text-left px-3 py-1.5 font-medium text-text-muted w-8">
                          <input
                            type="checkbox"
                            :checked="selectedPendingIds.size === streamStore.pendingEntries.length && streamStore.pendingEntries.length > 0"
                            class="rounded border-border"
                            @change="selectAllPending"
                          />
                        </th>
                        <th class="text-left px-3 py-1.5 font-medium text-text-muted">Entry ID</th>
                        <th class="text-left px-3 py-1.5 font-medium text-text-muted">Consumer</th>
                        <th class="text-center px-3 py-1.5 font-medium text-text-muted">Idle</th>
                        <th class="text-center px-3 py-1.5 font-medium text-text-muted">Deliveries</th>
                        <th class="text-right px-3 py-1.5 font-medium text-text-muted w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="pe in streamStore.pendingEntries"
                        :key="pe.id"
                        class="border-b border-border/30 hover:bg-overlay-0/20"
                      >
                        <td class="px-3 py-1.5">
                          <input
                            type="checkbox"
                            :checked="selectedPendingIds.has(pe.id)"
                            class="rounded border-border"
                            @change="togglePendingSelection(pe.id)"
                          />
                        </td>
                        <td class="px-3 py-1.5 font-mono text-accent">{{ pe.id }}</td>
                        <td class="px-3 py-1.5 font-mono text-text">{{ pe.consumer }}</td>
                        <td class="px-3 py-1.5 text-center text-text-muted">{{ formatIdleTime(pe.idleTime) }}</td>
                        <td class="px-3 py-1.5 text-center tabular-nums">{{ pe.deliveryCount }}</td>
                        <td class="px-3 py-1.5 text-right">
                          <button
                            class="px-1.5 py-0.5 text-xs rounded bg-success-muted text-success hover:bg-success/25 transition-colors"
                            @click="ackSingle(pe.id)"
                          >
                            ACK
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
