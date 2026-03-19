<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@renderer/stores/settings.store'
import type { ThemeSetting } from '@renderer/stores/settings.store'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const settingsStore = useSettingsStore()

// Computed two-way bindings for form controls
const theme = computed({
  get: () => settingsStore.theme,
  set: (val: ThemeSetting) => settingsStore.updateSetting('theme', val)
})

const fontSize = computed({
  get: () => settingsStore.fontSize,
  set: (val: number) => settingsStore.updateSetting('fontSize', val)
})

const keySeparator = computed({
  get: () => settingsStore.keySeparator,
  set: (val: string) => settingsStore.updateSetting('keySeparator', val)
})

const dateFormat = computed({
  get: () => settingsStore.dateFormat,
  set: (val: string) => settingsStore.updateSetting('dateFormat', val)
})

const scanCount = computed({
  get: () => settingsStore.scanCount,
  set: (val: number) => settingsStore.updateSetting('scanCount', val)
})

const autoRefreshInterval = computed({
  get: () => settingsStore.autoRefreshInterval,
  set: (val: number) => settingsStore.updateSetting('autoRefreshInterval', val)
})

const maxMonitorEntries = computed({
  get: () => settingsStore.maxMonitorEntries,
  set: (val: number) => settingsStore.updateSetting('maxMonitorEntries', val)
})

const dateFormatOptions = [
  'YYYY-MM-DD HH:mm:ss',
  'DD/MM/YYYY HH:mm:ss',
  'MM/DD/YYYY HH:mm:ss',
  'YYYY-MM-DD',
  'DD MMM YYYY HH:mm',
  'ISO 8601'
]

function handleGoBack() {
  router.back()
}
</script>

<template>
  <div class="flex h-full flex-col bg-base">
    <!-- Header -->
    <div class="flex items-center gap-3 border-b border-border px-6 py-4">
      <button
        class="rounded p-1 text-text-muted transition-colors hover:bg-overlay-0 hover:text-text"
        @click="handleGoBack"
      >
        <ArrowLeft class="h-4 w-4" :stroke-width="2" />
      </button>
      <h1 class="text-lg font-semibold text-text">Settings</h1>
    </div>

    <!-- Settings sections -->
    <div class="scrollbar-thin flex-1 overflow-y-auto">
      <div class="mx-auto max-w-2xl space-y-8 px-6 py-6">

        <!-- Appearance -->
        <section>
          <h2 class="mb-4 text-md font-semibold uppercase tracking-wider text-accent">
            Appearance
          </h2>
          <div class="space-y-5">
            <!-- Theme -->
            <div class="flex items-start justify-between gap-8">
              <div>
                <label class="text-md font-medium text-text">Theme</label>
                <p class="mt-0.5 text-xs text-text-muted">Choose the application color theme</p>
              </div>
              <div class="flex flex-shrink-0 gap-1.5">
                <button
                  v-for="opt in (['dark', 'light', 'system'] as const)"
                  :key="opt"
                  class="rounded-md border px-3 py-1.5 text-xs capitalize transition-colors"
                  :class="
                    theme === opt
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-border text-text-muted hover:border-border-accent hover:text-text'
                  "
                  @click="theme = opt"
                >
                  {{ opt }}
                </button>
              </div>
            </div>

            <!-- Font size -->
            <div class="flex items-start justify-between gap-8">
              <div>
                <label class="text-md font-medium text-text">Font Size</label>
                <p class="mt-0.5 text-xs text-text-muted">Base font size for the application ({{ fontSize }}px)</p>
              </div>
              <div class="flex flex-shrink-0 items-center gap-3">
                <span class="text-xs text-text-muted">10</span>
                <input
                  v-model.number="fontSize"
                  type="range"
                  min="10"
                  max="18"
                  step="1"
                  class="w-32 accent-accent"
                />
                <span class="text-xs text-text-muted">18</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Divider -->
        <div class="border-t border-border" />

        <!-- Editor -->
        <section>
          <h2 class="mb-4 text-md font-semibold uppercase tracking-wider text-accent">
            Editor
          </h2>
          <div class="space-y-5">
            <!-- Key separator -->
            <div class="flex items-start justify-between gap-8">
              <div>
                <label class="text-md font-medium text-text">Key Separator</label>
                <p class="mt-0.5 text-xs text-text-muted">Character used to separate key namespaces in the tree view</p>
              </div>
              <input
                v-model="keySeparator"
                type="text"
                maxlength="3"
                class="w-16 flex-shrink-0 rounded border border-border bg-input-bg px-2 py-1 text-center text-md text-text outline-none focus:border-accent"
              />
            </div>

            <!-- Date format -->
            <div class="flex items-start justify-between gap-8">
              <div>
                <label class="text-md font-medium text-text">Date Format</label>
                <p class="mt-0.5 text-xs text-text-muted">How dates and timestamps are displayed</p>
              </div>
              <select
                v-model="dateFormat"
                class="flex-shrink-0 rounded border border-border bg-input-bg px-2 py-1 text-md text-text outline-none focus:border-accent"
              >
                <option v-for="fmt in dateFormatOptions" :key="fmt" :value="fmt">
                  {{ fmt }}
                </option>
              </select>
            </div>
          </div>
        </section>

        <!-- Divider -->
        <div class="border-t border-border" />

        <!-- Performance -->
        <section>
          <h2 class="mb-4 text-md font-semibold uppercase tracking-wider text-accent">
            Performance
          </h2>
          <div class="space-y-5">
            <!-- Scan count -->
            <div class="flex items-start justify-between gap-8">
              <div>
                <label class="text-md font-medium text-text">Scan Count</label>
                <p class="mt-0.5 text-xs text-text-muted">Number of keys to fetch per SCAN iteration (higher = faster but more memory)</p>
              </div>
              <input
                v-model.number="scanCount"
                type="number"
                min="100"
                max="10000"
                step="100"
                class="w-24 flex-shrink-0 rounded border border-border bg-input-bg px-2 py-1 text-md text-text outline-none focus:border-accent"
              />
            </div>

            <!-- Auto-refresh interval -->
            <div class="flex items-start justify-between gap-8">
              <div>
                <label class="text-md font-medium text-text">Auto-Refresh Interval</label>
                <p class="mt-0.5 text-xs text-text-muted">Automatically refresh data at this interval in seconds (0 to disable)</p>
              </div>
              <input
                v-model.number="autoRefreshInterval"
                type="number"
                min="0"
                max="300"
                step="5"
                class="w-24 flex-shrink-0 rounded border border-border bg-input-bg px-2 py-1 text-md text-text outline-none focus:border-accent"
              />
            </div>

            <!-- Max monitor entries -->
            <div class="flex items-start justify-between gap-8">
              <div>
                <label class="text-md font-medium text-text">Max Monitor Entries</label>
                <p class="mt-0.5 text-xs text-text-muted">Maximum number of monitor log entries to keep in memory</p>
              </div>
              <input
                v-model.number="maxMonitorEntries"
                type="number"
                min="1000"
                max="50000"
                step="1000"
                class="w-24 flex-shrink-0 rounded border border-border bg-input-bg px-2 py-1 text-md text-text outline-none focus:border-accent"
              />
            </div>
          </div>
        </section>

        <!-- Divider -->
        <div class="border-t border-border" />

        <!-- Shortcuts -->
        <section>
          <h2 class="mb-4 text-md font-semibold uppercase tracking-wider text-accent">
            Shortcuts
          </h2>
          <div class="space-y-3">
            <div
              v-for="shortcut in [
                { label: 'New Connection', keys: 'Ctrl+N' },
                { label: 'Open CLI', keys: 'Ctrl+`' },
                { label: 'Refresh Keys', keys: 'Ctrl+R' },
                { label: 'Search Keys', keys: 'Ctrl+F' },
                { label: 'Settings', keys: 'Ctrl+,' },
                { label: 'Close Tab', keys: 'Ctrl+W' },
                { label: 'Toggle Sidebar', keys: 'Ctrl+B' },
              ]"
              :key="shortcut.label"
              class="flex items-center justify-between rounded-md bg-surface-0 px-3 py-2"
            >
              <span class="text-md text-text">{{ shortcut.label }}</span>
              <div class="flex gap-1">
                <kbd
                  v-for="key in shortcut.keys.split('+')"
                  :key="key"
                  class="rounded border border-border bg-overlay-0 px-1.5 py-0.5 font-mono text-xs text-text-secondary"
                >
                  {{ key }}
                </kbd>
              </div>
            </div>
          </div>
        </section>

        <!-- Bottom spacer -->
        <div class="h-4" />
      </div>
    </div>
  </div>
</template>
