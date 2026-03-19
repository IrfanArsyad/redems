<script setup lang="ts">
import { useSettingsStore } from '@renderer/stores/settings.store'
import ThemeSelector from './ThemeSelector.vue'
import { Palette, Code, Gauge, Keyboard } from 'lucide-vue-next'

const settings = useSettingsStore()
</script>

<template>
  <div class="h-full overflow-y-auto p-6 bg-base">
    <h1 class="text-lg font-bold text-text mb-6">Settings</h1>

    <!-- Appearance -->
    <section class="mb-5">
      <div class="card p-5">
        <div class="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
          <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-muted">
            <Palette class="w-3.5 h-3.5 text-accent" />
          </div>
          <h2 class="text-md font-semibold text-text">Appearance</h2>
        </div>

        <div class="space-y-6">
          <div>
            <label class="block text-xs font-medium text-text mb-1">Theme</label>
            <p class="text-xs text-text-faint mb-2.5">Choose your preferred color scheme</p>
            <ThemeSelector :model-value="settings.theme" @update:model-value="settings.updateSetting('theme', $event)" />
          </div>

          <div>
            <label class="block text-xs font-medium text-text mb-1">Font Size</label>
            <p class="text-xs text-text-faint mb-2.5">
              Base font size for the editor
              <span class="font-mono text-accent ml-1">{{ settings.fontSize }}px</span>
            </p>
            <input
              type="range"
              :value="settings.fontSize"
              min="10"
              max="20"
              step="1"
              class="w-64 accent-accent h-1.5"
              @input="settings.updateSetting('fontSize', parseInt(($event.target as HTMLInputElement).value))"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Editor -->
    <section class="mb-5">
      <div class="card p-5">
        <div class="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
          <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-info-muted">
            <Code class="w-3.5 h-3.5 text-info" />
          </div>
          <h2 class="text-md font-semibold text-text">Editor</h2>
        </div>

        <div class="space-y-6">
          <div>
            <label class="block text-xs font-medium text-text mb-1">Key Separator</label>
            <p class="text-xs text-text-faint mb-2.5">Character used to build the key tree hierarchy</p>
            <input
              type="text"
              :value="settings.keySeparator"
              maxlength="3"
              class="input-base !w-20"
              @input="settings.updateSetting('keySeparator', ($event.target as HTMLInputElement).value)"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-text mb-1">Date Format</label>
            <p class="text-xs text-text-faint mb-2.5">Display format for timestamps</p>
            <select
              :value="settings.dateFormat"
              class="input-base !w-auto"
              @change="settings.updateSetting('dateFormat', ($event.target as HTMLSelectElement).value)"
            >
              <option value="relative">Relative (2 hours ago)</option>
              <option value="iso">ISO 8601</option>
              <option value="locale">Locale Default</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- Performance -->
    <section class="mb-5">
      <div class="card p-5">
        <div class="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
          <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-warning-muted">
            <Gauge class="w-3.5 h-3.5 text-warning" />
          </div>
          <h2 class="text-md font-semibold text-text">Performance</h2>
        </div>

        <div class="space-y-6">
          <div>
            <label class="block text-xs font-medium text-text mb-1">Scan Count</label>
            <p class="text-xs text-text-faint mb-2.5">Number of keys to fetch per SCAN iteration</p>
            <input
              type="number"
              :value="settings.scanCount"
              min="100"
              max="10000"
              step="100"
              class="input-base !w-32"
              @input="settings.updateSetting('scanCount', parseInt(($event.target as HTMLInputElement).value) || 500)"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-text mb-1">Auto-Refresh Interval</label>
            <p class="text-xs text-text-faint mb-2.5">Interval for auto-refreshing server info (0 = disabled)</p>
            <select
              :value="settings.autoRefreshInterval"
              class="input-base !w-auto"
              @change="settings.updateSetting('autoRefreshInterval', parseInt(($event.target as HTMLSelectElement).value))"
            >
              <option :value="0">Disabled</option>
              <option :value="1000">1 second</option>
              <option :value="2000">2 seconds</option>
              <option :value="5000">5 seconds</option>
              <option :value="10000">10 seconds</option>
              <option :value="30000">30 seconds</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-text mb-1">Max Monitor Entries</label>
            <p class="text-xs text-text-faint mb-2.5">Maximum entries to keep in monitor buffer</p>
            <input
              type="number"
              :value="settings.maxMonitorEntries"
              min="1000"
              max="50000"
              step="1000"
              class="input-base !w-32"
              @input="settings.updateSetting('maxMonitorEntries', parseInt(($event.target as HTMLInputElement).value) || 5000)"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Keyboard Shortcuts -->
    <section class="mb-5">
      <div class="card p-5">
        <div class="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
          <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-success-muted">
            <Keyboard class="w-3.5 h-3.5 text-success" />
          </div>
          <h2 class="text-md font-semibold text-text">Keyboard Shortcuts</h2>
        </div>

        <div class="rounded-lg border border-border overflow-hidden">
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-overlay-0/30">
                <th class="text-left px-4 py-2.5 text-text-faint font-semibold text-xs uppercase tracking-wider">Action</th>
                <th class="text-left px-4 py-2.5 text-text-faint font-semibold text-xs uppercase tracking-wider">Shortcut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr v-for="shortcut in shortcuts" :key="shortcut.action" class="hover:bg-overlay-0/15 transition-colors">
                <td class="px-4 py-2.5 text-text-secondary">{{ shortcut.action }}</td>
                <td class="px-4 py-2.5">
                  <kbd class="inline-flex items-center px-2 py-0.5 bg-overlay-0/50 border border-border rounded-md text-xs text-text-muted font-mono">
                    {{ shortcut.key }}
                  </kbd>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
const shortcuts = [
  { action: 'New Connection', key: 'Ctrl+N' },
  { action: 'Close Tab', key: 'Ctrl+W' },
  { action: 'Search Keys', key: 'Ctrl+F' },
  { action: 'Toggle CLI', key: 'Ctrl+`' },
  { action: 'Refresh', key: 'F5' },
  { action: 'Delete Key', key: 'Delete' },
  { action: 'Rename Key', key: 'F2' },
  { action: 'Settings', key: 'Ctrl+,' }
]
</script>
