<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useClusterStore } from '@renderer/stores/cluster.store'
import { RefreshCw, Network } from 'lucide-vue-next'

const props = defineProps<{
  connectionId: string
}>()

const clusterStore = useClusterStore()

onMounted(async () => {
  await clusterStore.fetchClusterInfo(props.connectionId)
})

async function refresh(): Promise<void> {
  await clusterStore.fetchClusterInfo(props.connectionId)
}

const info = computed(() => clusterStore.clusterInfo)
const nodes = computed(() => info.value?.nodes ?? [])

const stateColor = computed<string>(() => {
  if (!info.value) return 'text-text-muted'
  return info.value.state === 'ok' ? 'text-success' : 'text-danger'
})

const stateBgColor = computed<string>(() => {
  if (!info.value) return 'bg-overlay-0'
  return info.value.state === 'ok' ? 'bg-success-muted' : 'bg-danger-muted'
})

function truncateId(id: string): string {
  if (id.length <= 12) return id
  return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`
}

function roleClass(role: 'master' | 'slave'): string {
  return role === 'master'
    ? 'bg-accent-muted text-accent'
    : 'bg-success-muted text-success'
}

function linkStateClass(linkState: string): string {
  return linkState === 'connected'
    ? 'text-success'
    : 'text-danger'
}
</script>

<template>
  <div class="flex flex-col h-full bg-base">
    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface-0">
      <Network class="w-3.5 h-3.5 text-accent" />
      <span class="text-xs font-medium text-text">Cluster Overview</span>
      <div class="flex-1" />
      <button
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-muted hover:text-text hover:bg-overlay-0/50 rounded-md transition-colors"
        :class="{ 'opacity-50': clusterStore.loading }"
        :disabled="clusterStore.loading"
        @click="refresh"
      >
        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': clusterStore.loading }" />
        Refresh
      </button>
    </div>

    <div class="flex-1 overflow-auto p-4 space-y-4">
      <!-- Loading -->
      <div v-if="clusterStore.loading && !info" class="flex items-center justify-center h-full">
        <span class="text-xs text-text-muted">Loading cluster info...</span>
      </div>

      <template v-if="info">
        <!-- Status Cards -->
        <div class="grid grid-cols-3 lg:grid-cols-6 gap-3">
          <!-- Cluster State -->
          <div class="bg-surface-0 border border-border rounded-xl p-3">
            <div class="text-xs text-text-muted uppercase tracking-wider mb-1">State</div>
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full"
                :class="stateBgColor"
              >
                <span
                  class="block w-full h-full rounded-full"
                  :class="info.state === 'ok' ? 'bg-success' : 'bg-danger'"
                />
              </span>
              <span class="text-md font-semibold uppercase" :class="stateColor">
                {{ info.state }}
              </span>
            </div>
          </div>

          <!-- Known Nodes -->
          <div class="bg-surface-0 border border-border rounded-xl p-3">
            <div class="text-xs text-text-muted uppercase tracking-wider mb-1">Known Nodes</div>
            <div class="text-xl font-semibold text-text tabular-nums">{{ info.knownNodes }}</div>
          </div>

          <!-- Cluster Size -->
          <div class="bg-surface-0 border border-border rounded-xl p-3">
            <div class="text-xs text-text-muted uppercase tracking-wider mb-1">Cluster Size</div>
            <div class="text-xl font-semibold text-text tabular-nums">{{ info.size }}</div>
          </div>

          <!-- Slots Assigned -->
          <div class="bg-surface-0 border border-border rounded-xl p-3">
            <div class="text-xs text-text-muted uppercase tracking-wider mb-1">Slots Assigned</div>
            <div class="text-xl font-semibold text-text tabular-nums">{{ info.slotsAssigned.toLocaleString() }}</div>
          </div>

          <!-- Slots OK -->
          <div class="bg-surface-0 border border-border rounded-xl p-3">
            <div class="text-xs text-text-muted uppercase tracking-wider mb-1">Slots OK</div>
            <div class="text-xl font-semibold text-success tabular-nums">{{ info.slotsOk.toLocaleString() }}</div>
          </div>

          <!-- Slots Fail -->
          <div class="bg-surface-0 border border-border rounded-xl p-3">
            <div class="text-xs text-text-muted uppercase tracking-wider mb-1">Slots Fail</div>
            <div
              class="text-xl font-semibold tabular-nums"
              :class="info.slotsFail > 0 ? 'text-danger' : 'text-text'"
            >
              {{ info.slotsFail }}
            </div>
            <div v-if="info.slotsPfail > 0" class="text-xs text-warning mt-0.5">
              {{ info.slotsPfail }} pfail
            </div>
          </div>
        </div>

        <!-- Current Epoch -->
        <div class="flex items-center gap-4 px-1">
          <span class="text-xs text-text-muted">
            Current Epoch: <span class="text-text tabular-nums">{{ info.currentEpoch }}</span>
          </span>
          <span class="text-xs text-text-muted">
            My Epoch: <span class="text-text tabular-nums">{{ info.myEpoch }}</span>
          </span>
        </div>

        <!-- Node List Table -->
        <div class="bg-surface-0 border border-border rounded-xl overflow-hidden">
          <div class="px-4 py-2.5 border-b border-border">
            <span class="text-xs font-medium text-text">Cluster Nodes ({{ nodes.length }})</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-border bg-overlay-0/30">
                  <th class="text-left px-4 py-2 font-medium text-text-muted">ID</th>
                  <th class="text-left px-4 py-2 font-medium text-text-muted">Address</th>
                  <th class="text-left px-4 py-2 font-medium text-text-muted">Role</th>
                  <th class="text-left px-4 py-2 font-medium text-text-muted">Master ID</th>
                  <th class="text-left px-4 py-2 font-medium text-text-muted">Link State</th>
                  <th class="text-left px-4 py-2 font-medium text-text-muted">Slots</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="node in nodes"
                  :key="node.id"
                  class="border-b border-border/50 hover:bg-overlay-0/20 transition-colors"
                >
                  <td class="px-4 py-2 font-mono text-text-muted" :title="node.id">
                    {{ truncateId(node.id) }}
                  </td>
                  <td class="px-4 py-2 text-text font-mono">
                    {{ node.address }}
                  </td>
                  <td class="px-4 py-2">
                    <span
                      class="inline-block px-1.5 py-0.5 text-xs font-medium rounded-md"
                      :class="roleClass(node.role)"
                    >
                      {{ node.role }}
                    </span>
                  </td>
                  <td class="px-4 py-2 font-mono text-text-muted">
                    {{ node.master ? truncateId(node.master) : '-' }}
                  </td>
                  <td class="px-4 py-2">
                    <span :class="linkStateClass(node.linkState)">
                      {{ node.linkState }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-text-muted font-mono">
                    <span v-if="node.slots.length > 0">
                      {{ node.slots.join(', ') }}
                    </span>
                    <span v-else>-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
