<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { ConnectionConfig } from '@shared/types/connection.types'
import { createDefaultConnection } from '@shared/types/connection.types'
import ConnectionTest from './ConnectionTest.vue'
import {
  X,
  Eye,
  EyeOff,
  LoaderCircle,
  Server,
  Shield,
  Lock,
  Settings2,
  Palette
} from 'lucide-vue-next'

const props = defineProps<{
  connection: ConnectionConfig | null
  visible: boolean
}>()

const emit = defineEmits<{
  save: [config: ConnectionConfig]
  cancel: []
  test: [config: ConnectionConfig]
}>()

// Tabs
type TabId = 'general' | 'ssh' | 'ssl' | 'advanced'
const activeTab = ref<TabId>('general')
const tabs: { id: TabId; label: string; icon: typeof Server }[] = [
  { id: 'general', label: 'General', icon: Server },
  { id: 'ssh', label: 'SSH Tunnel', icon: Shield },
  { id: 'ssl', label: 'SSL/TLS', icon: Lock },
  { id: 'advanced', label: 'Advanced', icon: Settings2 }
]

// Form data
const form = reactive<ConnectionConfig>(createDefaultConnection(crypto.randomUUID()))

// SSH auth method
const sshAuthMethod = ref<'password' | 'privateKey'>('password')

// Password visibility toggles
const showPassword = ref(false)
const showSSHPassword = ref(false)

// Test state
const testing = ref(false)
const testResult = ref<{
  success: boolean
  message: string
  latency?: number
  serverVersion?: string
} | null>(null)

// Validation
const errors = ref<Record<string, string>>({})

const isValid = computed(() => {
  return form.name.trim() !== '' && form.host.trim() !== '' && form.port > 0
})

// Cluster nodes textarea for cluster mode
const clusterNodesText = ref('')

// Sentinel nodes textarea for sentinel mode
const sentinelNodesText = ref('')

// Populate form when connection prop changes
watch(
  () => [props.connection, props.visible],
  () => {
    if (props.visible) {
      activeTab.value = 'general'
      testResult.value = null
      testing.value = false
      errors.value = {}
      showPassword.value = false
      showSSHPassword.value = false

      if (props.connection) {
        Object.assign(form, JSON.parse(JSON.stringify(props.connection)))
        sshAuthMethod.value = form.ssh.privateKey ? 'privateKey' : 'password'
        sentinelNodesText.value = form.sentinel.sentinels
          .map((s) => `${s.host}:${s.port}`)
          .join('\n')
      } else {
        const defaults = createDefaultConnection(crypto.randomUUID())
        Object.assign(form, defaults)
        sshAuthMethod.value = 'password'
        clusterNodesText.value = ''
        sentinelNodesText.value = '127.0.0.1:26379'
      }
    }
  },
  { immediate: true }
)

function validate(): boolean {
  errors.value = {}

  if (!form.name.trim()) {
    errors.value.name = 'Connection name is required'
  }
  if (!form.host.trim()) {
    errors.value.host = 'Host is required'
  }
  if (!form.port || form.port < 1 || form.port > 65535) {
    errors.value.port = 'Port must be between 1 and 65535'
  }

  if (form.ssh.enabled) {
    if (!form.ssh.host.trim()) {
      errors.value.sshHost = 'SSH host is required'
    }
    if (!form.ssh.username.trim()) {
      errors.value.sshUsername = 'SSH username is required'
    }
  }

  if (form.mode === 'sentinel') {
    if (!form.sentinel.masterName.trim()) {
      errors.value.sentinelMaster = 'Sentinel master name is required'
    }
  }

  return Object.keys(errors.value).length === 0
}

function handleSave() {
  if (!validate()) return

  // Parse sentinel nodes from text
  if (form.mode === 'sentinel' && sentinelNodesText.value.trim()) {
    form.sentinel.sentinels = sentinelNodesText.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => {
        const [host, portStr] = line.split(':')
        return { host: host || '127.0.0.1', port: parseInt(portStr) || 26379 }
      })
  }

  form.updatedAt = Date.now()
  emit('save', JSON.parse(JSON.stringify(form)))
}

async function handleTest() {
  if (!validate()) return

  testing.value = true
  testResult.value = null
  emit('test', JSON.parse(JSON.stringify(form)))
}

function handleCancel() {
  emit('cancel')
}

// Expose method for parent to set test result
function setTestResult(result: typeof testResult.value) {
  testing.value = false
  testResult.value = result
}

defineExpose({ setTestResult })
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="handleCancel"
        />

        <!-- Modal panel -->
        <div class="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-base shadow-2xl shadow-black/50">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 class="text-base font-semibold text-text">
              {{ connection ? 'Edit Connection' : 'New Connection' }}
            </h2>
            <button
              class="btn-icon-sm"
              @click="handleCancel"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Tabs -->
          <div class="border-b border-border bg-surface-0/50 px-6">
            <div class="flex gap-0.5">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                class="relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors rounded-t-md"
                :class="
                  activeTab === tab.id
                    ? 'text-accent'
                    : 'text-text-muted hover:text-text'
                "
                @click="activeTab = tab.id"
              >
                <component :is="tab.icon" class="h-3.5 w-3.5" />
                {{ tab.label }}
                <span
                  v-if="activeTab === tab.id"
                  class="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-accent"
                />
              </button>
            </div>
          </div>

          <!-- Form body -->
          <div class="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">
            <!-- General tab -->
            <div v-show="activeTab === 'general'" class="space-y-5">
              <!-- Section heading: Server -->
              <div class="flex items-center gap-2 pb-1">
                <Server class="h-4 w-4 text-text-muted" />
                <h3 class="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Server Details</h3>
              </div>

              <!-- Name -->
              <div>
                <label class="mb-1.5 block text-xs font-medium text-text-secondary">Name <span class="text-danger">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="My Redis Server"
                  class="input-base"
                  :class="errors.name ? '!border-danger focus:!ring-danger/20' : ''"
                />
                <p v-if="errors.name" class="mt-1.5 text-xs text-danger">{{ errors.name }}</p>
              </div>

              <!-- Host + Port row -->
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="mb-1.5 block text-xs font-medium text-text-secondary">Host <span class="text-danger">*</span></label>
                  <input
                    v-model="form.host"
                    type="text"
                    placeholder="127.0.0.1"
                    class="input-base"
                    :class="errors.host ? '!border-danger focus:!ring-danger/20' : ''"
                  />
                  <p v-if="errors.host" class="mt-1.5 text-xs text-danger">{{ errors.host }}</p>
                </div>
                <div class="w-28">
                  <label class="mb-1.5 block text-xs font-medium text-text-secondary">Port <span class="text-danger">*</span></label>
                  <input
                    v-model.number="form.port"
                    type="number"
                    min="1"
                    max="65535"
                    placeholder="6379"
                    class="input-base"
                    :class="errors.port ? '!border-danger focus:!ring-danger/20' : ''"
                  />
                  <p v-if="errors.port" class="mt-1.5 text-xs text-danger">{{ errors.port }}</p>
                </div>
              </div>

              <!-- Username + Password row -->
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="mb-1.5 block text-xs font-medium text-text-secondary">Username</label>
                  <input
                    v-model="form.username"
                    type="text"
                    placeholder="default"
                    class="input-base"
                  />
                </div>
                <div class="flex-1">
                  <label class="mb-1.5 block text-xs font-medium text-text-secondary">Password</label>
                  <div class="relative">
                    <input
                      v-model="form.password"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="Password"
                      class="input-base !pr-9"
                    />
                    <button
                      type="button"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      @click="showPassword = !showPassword"
                    >
                      <Eye v-if="!showPassword" class="h-4 w-4" />
                      <EyeOff v-else class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Database number -->
              <div class="w-28">
                <label class="mb-1.5 block text-xs font-medium text-text-secondary">Database</label>
                <input
                  v-model.number="form.db"
                  type="number"
                  min="0"
                  max="15"
                  class="input-base"
                />
              </div>

              <!-- Connection mode -->
              <div>
                <label class="mb-1.5 block text-xs font-medium text-text-secondary">Connection Mode</label>
                <div class="flex gap-2">
                  <button
                    v-for="mode in (['standalone', 'cluster', 'sentinel'] as const)"
                    :key="mode"
                    class="rounded-md border px-3.5 py-2 text-xs font-medium capitalize transition-all"
                    :class="
                      form.mode === mode
                        ? 'border-accent bg-accent-subtle text-accent shadow-sm shadow-accent/10'
                        : 'border-border text-text-muted hover:border-text-faint hover:text-text'
                    "
                    @click="form.mode = mode"
                  >
                    {{ mode }}
                  </button>
                </div>
              </div>

              <!-- Cluster nodes (shown when mode=cluster) -->
              <div v-if="form.mode === 'cluster'">
                <label class="mb-1.5 block text-xs font-medium text-text-secondary">Cluster Nodes</label>
                <p class="mb-2 text-xs text-text-faint">One host:port per line</p>
                <textarea
                  v-model="clusterNodesText"
                  rows="4"
                  placeholder="127.0.0.1:7000&#10;127.0.0.1:7001&#10;127.0.0.1:7002"
                  class="input-base !text-xs font-mono resize-none"
                />
              </div>

              <!-- Group -->
              <div>
                <label class="mb-1.5 block text-xs font-medium text-text-secondary">Group</label>
                <input
                  v-model="form.group"
                  type="text"
                  placeholder="e.g., Production, Development"
                  class="input-base"
                />
                <p class="mt-1.5 text-xs text-text-faint">Organize connections by group in the sidebar</p>
              </div>

              <!-- Color picker -->
              <div>
                <div class="mb-1.5 flex items-center gap-1.5">
                  <Palette class="h-3.5 w-3.5 text-text-muted" />
                  <label class="text-xs font-medium text-text-secondary">Color Label</label>
                </div>
                <div class="flex items-center gap-2.5">
                  <input
                    v-model="form.color"
                    type="color"
                    class="h-8 w-8 cursor-pointer rounded-md border border-border bg-transparent"
                  />
                  <input
                    v-model="form.color"
                    type="text"
                    placeholder="#89b4fa"
                    class="w-28 rounded-md border border-border bg-input-bg px-2.5 py-1.5 text-xs text-text placeholder-muted outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
                  />
                  <button
                    v-if="form.color"
                    class="rounded-md px-2 py-1 text-xs text-text-faint transition-colors hover:bg-overlay-0 hover:text-text"
                    @click="form.color = ''"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <!-- SSH Tunnel tab -->
            <div v-show="activeTab === 'ssh'" class="space-y-5">
              <!-- Section heading -->
              <div class="flex items-center gap-2 pb-1">
                <Shield class="h-4 w-4 text-text-muted" />
                <h3 class="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">SSH Tunnel Configuration</h3>
              </div>

              <!-- Enable toggle -->
              <label class="flex items-center gap-3 cursor-pointer rounded-md border border-border bg-surface-0/50 px-4 py-3 transition-colors hover:bg-surface-1">
                <input
                  v-model="form.ssh.enabled"
                  type="checkbox"
                  class="h-4 w-4 rounded border-border bg-input-bg text-accent accent-accent"
                />
                <div>
                  <span class="text-xs font-medium text-text">Enable SSH Tunnel</span>
                  <p class="text-xs text-text-faint">Connect to Redis through an SSH tunnel</p>
                </div>
              </label>

              <template v-if="form.ssh.enabled">
                <!-- SSH Host + Port -->
                <div class="flex gap-3">
                  <div class="flex-1">
                    <label class="mb-1.5 block text-xs font-medium text-text-secondary">SSH Host <span class="text-danger">*</span></label>
                    <input
                      v-model="form.ssh.host"
                      type="text"
                      placeholder="ssh.example.com"
                      class="input-base"
                      :class="errors.sshHost ? '!border-danger focus:!ring-danger/20' : ''"
                    />
                    <p v-if="errors.sshHost" class="mt-1.5 text-xs text-danger">{{ errors.sshHost }}</p>
                  </div>
                  <div class="w-28">
                    <label class="mb-1.5 block text-xs font-medium text-text-secondary">SSH Port</label>
                    <input
                      v-model.number="form.ssh.port"
                      type="number"
                      min="1"
                      max="65535"
                      placeholder="22"
                      class="input-base"
                    />
                  </div>
                </div>

                <!-- SSH Username -->
                <div>
                  <label class="mb-1.5 block text-xs font-medium text-text-secondary">SSH Username <span class="text-danger">*</span></label>
                  <input
                    v-model="form.ssh.username"
                    type="text"
                    placeholder="root"
                    class="input-base"
                    :class="errors.sshUsername ? '!border-danger focus:!ring-danger/20' : ''"
                  />
                  <p v-if="errors.sshUsername" class="mt-1.5 text-xs text-danger">{{ errors.sshUsername }}</p>
                </div>

                <!-- Auth method -->
                <div>
                  <label class="mb-1.5 block text-xs font-medium text-text-secondary">Authentication Method</label>
                  <div class="flex gap-2">
                    <button
                      class="rounded-md border px-3.5 py-2 text-xs font-medium transition-all"
                      :class="
                        sshAuthMethod === 'password'
                          ? 'border-accent bg-accent-subtle text-accent shadow-sm shadow-accent/10'
                          : 'border-border text-text-muted hover:border-text-faint hover:text-text'
                      "
                      @click="sshAuthMethod = 'password'"
                    >
                      Password
                    </button>
                    <button
                      class="rounded-md border px-3.5 py-2 text-xs font-medium transition-all"
                      :class="
                        sshAuthMethod === 'privateKey'
                          ? 'border-accent bg-accent-subtle text-accent shadow-sm shadow-accent/10'
                          : 'border-border text-text-muted hover:border-text-faint hover:text-text'
                      "
                      @click="sshAuthMethod = 'privateKey'"
                    >
                      Private Key
                    </button>
                  </div>
                </div>

                <!-- SSH Password -->
                <div v-if="sshAuthMethod === 'password'">
                  <label class="mb-1.5 block text-xs font-medium text-text-secondary">SSH Password</label>
                  <div class="relative">
                    <input
                      v-model="form.ssh.password"
                      :type="showSSHPassword ? 'text' : 'password'"
                      placeholder="SSH Password"
                      class="input-base !pr-9"
                    />
                    <button
                      type="button"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      @click="showSSHPassword = !showSSHPassword"
                    >
                      <Eye v-if="!showSSHPassword" class="h-4 w-4" />
                      <EyeOff v-else class="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <!-- Private Key Path -->
                <div v-if="sshAuthMethod === 'privateKey'">
                  <label class="mb-1.5 block text-xs font-medium text-text-secondary">Private Key File Path</label>
                  <input
                    v-model="form.ssh.privateKey"
                    type="text"
                    placeholder="~/.ssh/id_rsa"
                    class="input-base"
                  />
                  <div class="mt-3">
                    <label class="mb-1.5 block text-xs font-medium text-text-secondary">Passphrase</label>
                    <input
                      v-model="form.ssh.passphrase"
                      type="password"
                      placeholder="Key passphrase (optional)"
                      class="input-base"
                    />
                  </div>
                </div>
              </template>
            </div>

            <!-- SSL/TLS tab -->
            <div v-show="activeTab === 'ssl'" class="space-y-5">
              <!-- Section heading -->
              <div class="flex items-center gap-2 pb-1">
                <Lock class="h-4 w-4 text-text-muted" />
                <h3 class="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">SSL/TLS Configuration</h3>
              </div>

              <!-- Enable toggle -->
              <label class="flex items-center gap-3 cursor-pointer rounded-md border border-border bg-surface-0/50 px-4 py-3 transition-colors hover:bg-surface-1">
                <input
                  v-model="form.ssl.enabled"
                  type="checkbox"
                  class="h-4 w-4 rounded border-border bg-input-bg text-accent accent-accent"
                />
                <div>
                  <span class="text-xs font-medium text-text">Enable SSL/TLS</span>
                  <p class="text-xs text-text-faint">Encrypt the connection with SSL/TLS</p>
                </div>
              </label>

              <template v-if="form.ssl.enabled">
                <!-- Certificate paths section -->
                <div class="space-y-4 rounded-lg border border-border bg-surface-0/30 p-4">
                  <h4 class="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Certificate Files</h4>

                  <!-- CA Certificate -->
                  <div>
                    <label class="mb-1.5 block text-xs font-medium text-text-secondary">CA Certificate Path</label>
                    <input
                      v-model="form.ssl.ca"
                      type="text"
                      placeholder="/path/to/ca.crt"
                      class="input-base"
                    />
                  </div>

                  <!-- Client Certificate -->
                  <div>
                    <label class="mb-1.5 block text-xs font-medium text-text-secondary">Client Certificate Path</label>
                    <input
                      v-model="form.ssl.cert"
                      type="text"
                      placeholder="/path/to/client.crt"
                      class="input-base"
                    />
                  </div>

                  <!-- Client Key -->
                  <div>
                    <label class="mb-1.5 block text-xs font-medium text-text-secondary">Client Key Path</label>
                    <input
                      v-model="form.ssl.key"
                      type="text"
                      placeholder="/path/to/client.key"
                      class="input-base"
                    />
                  </div>
                </div>

                <!-- Reject Unauthorized -->
                <label class="flex items-center gap-3 cursor-pointer rounded-md border border-border bg-surface-0/50 px-4 py-3 transition-colors hover:bg-surface-1">
                  <input
                    v-model="form.ssl.rejectUnauthorized"
                    type="checkbox"
                    class="h-4 w-4 rounded border-border bg-input-bg text-accent accent-accent"
                  />
                  <div>
                    <span class="text-xs font-medium text-text">Reject Unauthorized</span>
                    <p class="text-xs text-text-faint">Verify the server certificate against the list of trusted CAs</p>
                  </div>
                </label>
              </template>
            </div>

            <!-- Advanced tab -->
            <div v-show="activeTab === 'advanced'" class="space-y-5">
              <!-- Section heading -->
              <div class="flex items-center gap-2 pb-1">
                <Settings2 class="h-4 w-4 text-text-muted" />
                <h3 class="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Advanced Settings</h3>
              </div>

              <!-- Timeouts row -->
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="mb-1.5 block text-xs font-medium text-text-secondary">Connect Timeout (ms)</label>
                  <input
                    v-model.number="form.connectTimeout"
                    type="number"
                    min="1000"
                    max="60000"
                    step="1000"
                    class="input-base"
                  />
                </div>
                <div class="flex-1">
                  <label class="mb-1.5 block text-xs font-medium text-text-secondary">Command Timeout (ms)</label>
                  <input
                    v-model.number="form.commandTimeout"
                    type="number"
                    min="1000"
                    max="60000"
                    step="1000"
                    class="input-base"
                  />
                </div>
              </div>

              <!-- Read-only mode -->
              <label class="flex items-center gap-3 cursor-pointer rounded-md border border-border bg-surface-0/50 px-4 py-3 transition-colors hover:bg-surface-1">
                <input
                  v-model="form.readOnly"
                  type="checkbox"
                  class="h-4 w-4 rounded border-border bg-input-bg text-accent accent-accent"
                />
                <div>
                  <span class="text-xs font-medium text-text">Read-Only Mode</span>
                  <p class="text-xs text-text-faint">Prevent accidental write operations on this connection</p>
                </div>
              </label>

              <!-- Sentinel config (shown when mode=sentinel) -->
              <template v-if="form.mode === 'sentinel'">
                <div class="rounded-lg border border-border bg-surface-0/30 p-4">
                  <h4 class="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
                    Sentinel Configuration
                  </h4>
                  <div class="space-y-4">
                    <div>
                      <label class="mb-1.5 block text-xs font-medium text-text-secondary">Master Name <span class="text-danger">*</span></label>
                      <input
                        v-model="form.sentinel.masterName"
                        type="text"
                        placeholder="mymaster"
                        class="input-base"
                        :class="errors.sentinelMaster ? '!border-danger focus:!ring-danger/20' : ''"
                      />
                      <p v-if="errors.sentinelMaster" class="mt-1.5 text-xs text-danger">{{ errors.sentinelMaster }}</p>
                    </div>
                    <div>
                      <label class="mb-1.5 block text-xs font-medium text-text-secondary">Sentinel Nodes</label>
                      <p class="mb-2 text-xs text-text-faint">One host:port per line</p>
                      <textarea
                        v-model="sentinelNodesText"
                        rows="3"
                        placeholder="127.0.0.1:26379&#10;127.0.0.1:26380&#10;127.0.0.1:26381"
                        class="input-base !text-xs font-mono resize-none"
                      />
                    </div>
                    <div>
                      <label class="mb-1.5 block text-xs font-medium text-text-secondary">Sentinel Password</label>
                      <input
                        v-model="form.sentinel.password"
                        type="password"
                        placeholder="Sentinel password (optional)"
                        class="input-base"
                      />
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-border px-6 py-4">
            <!-- Test result / spinner -->
            <div class="min-w-0 flex-1 pr-4">
              <ConnectionTest :testing="testing" :result="testResult" />
            </div>

            <!-- Action buttons -->
            <div class="flex flex-shrink-0 items-center gap-2">
              <button
                class="btn-secondary !text-xs"
                @click="handleTest"
              >
                <LoaderCircle v-if="testing" class="h-3.5 w-3.5 animate-spin" />
                Test
              </button>
              <button
                class="btn-ghost !text-xs"
                @click="handleCancel"
              >
                Cancel
              </button>
              <button
                class="btn-primary !text-xs"
                :disabled="!isValid"
                @click="handleSave"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active > .relative,
.modal-leave-active > .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > .relative {
  transform: scale(0.95) translateY(4px);
  opacity: 0;
}

.modal-leave-to > .relative {
  transform: scale(0.95) translateY(4px);
  opacity: 0;
}
</style>
