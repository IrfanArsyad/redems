<script setup lang="ts">
import { Moon, Sun, Monitor, Check } from 'lucide-vue-next'

type ThemeSetting = 'dark' | 'light' | 'system'

const props = defineProps<{
  modelValue: ThemeSetting
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ThemeSetting): void
}>()

function selectTheme(theme: ThemeSetting): void {
  emit('update:modelValue', theme)
}

interface ThemeOption {
  value: ThemeSetting
  label: string
  description: string
}

const options: ThemeOption[] = [
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes'
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Classic bright theme'
  },
  {
    value: 'system',
    label: 'System',
    description: 'Match OS preference'
  }
]
</script>

<template>
  <div class="space-y-2">
    <label class="text-xs font-medium text-text">Theme</label>
    <div class="grid grid-cols-3 gap-3">
      <!-- Dark option -->
      <button
        class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all"
        :class="modelValue === 'dark'
          ? 'border-accent bg-accent/5'
          : 'border-border hover:border-border-accent bg-surface-0'"
        @click="selectTheme('dark')"
      >
        <!-- Dark swatch preview -->
        <div class="w-full h-16 rounded-md overflow-hidden border border-border/50">
          <div class="h-full flex">
            <!-- Sidebar -->
            <div class="w-1/4 h-full" style="background-color: #181825" />
            <!-- Main area -->
            <div class="flex-1 flex flex-col">
              <!-- Titlebar -->
              <div class="h-2" style="background-color: #11111b" />
              <!-- Content -->
              <div class="flex-1 p-1" style="background-color: #1e1e2e">
                <div class="w-full h-1 rounded-full mb-0.5" style="background-color: #45475a" />
                <div class="w-3/4 h-1 rounded-full mb-0.5" style="background-color: #45475a" />
                <div class="w-1/2 h-1 rounded-full" style="background-color: #89b4fa; opacity: 0.5" />
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <Moon class="w-3.5 h-3.5" :class="modelValue === 'dark' ? 'text-accent' : 'text-text-muted'" />
          <div class="text-center">
            <div class="text-xs font-medium" :class="modelValue === 'dark' ? 'text-accent' : 'text-text'">
              Dark
            </div>
          </div>
        </div>
        <div class="text-xs text-text-muted">Easy on the eyes</div>

        <!-- Selected indicator -->
        <div
          v-if="modelValue === 'dark'"
          class="w-4 h-4 rounded-full bg-accent flex items-center justify-center"
        >
          <Check class="w-2.5 h-2.5 text-white" :stroke-width="3" />
        </div>
      </button>

      <!-- Light option -->
      <button
        class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all"
        :class="modelValue === 'light'
          ? 'border-accent bg-accent/5'
          : 'border-border hover:border-border-accent bg-surface-0'"
        @click="selectTheme('light')"
      >
        <!-- Light swatch preview -->
        <div class="w-full h-16 rounded-md overflow-hidden border border-border/50">
          <div class="h-full flex">
            <!-- Sidebar -->
            <div class="w-1/4 h-full" style="background-color: #f1f3f5" />
            <!-- Main area -->
            <div class="flex-1 flex flex-col">
              <!-- Titlebar -->
              <div class="h-2" style="background-color: #e9ecef" />
              <!-- Content -->
              <div class="flex-1 p-1" style="background-color: #ffffff">
                <div class="w-full h-1 rounded-full mb-0.5" style="background-color: #dee2e6" />
                <div class="w-3/4 h-1 rounded-full mb-0.5" style="background-color: #dee2e6" />
                <div class="w-1/2 h-1 rounded-full" style="background-color: #4263eb; opacity: 0.5" />
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <Sun class="w-3.5 h-3.5" :class="modelValue === 'light' ? 'text-accent' : 'text-text-muted'" />
          <div class="text-center">
            <div class="text-xs font-medium" :class="modelValue === 'light' ? 'text-accent' : 'text-text'">
              Light
            </div>
          </div>
        </div>
        <div class="text-xs text-text-muted">Classic bright theme</div>

        <!-- Selected indicator -->
        <div
          v-if="modelValue === 'light'"
          class="w-4 h-4 rounded-full bg-accent flex items-center justify-center"
        >
          <Check class="w-2.5 h-2.5 text-white" :stroke-width="3" />
        </div>
      </button>

      <!-- System option -->
      <button
        class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all"
        :class="modelValue === 'system'
          ? 'border-accent bg-accent/5'
          : 'border-border hover:border-border-accent bg-surface-0'"
        @click="selectTheme('system')"
      >
        <!-- Half-dark/half-light swatch preview -->
        <div class="w-full h-16 rounded-md overflow-hidden border border-border/50">
          <div class="h-full flex">
            <!-- Dark half -->
            <div class="w-1/2 h-full flex">
              <div class="w-1/3 h-full" style="background-color: #181825" />
              <div class="flex-1 flex flex-col">
                <div class="h-2" style="background-color: #11111b" />
                <div class="flex-1 p-0.5" style="background-color: #1e1e2e">
                  <div class="w-full h-1 rounded-full mb-0.5" style="background-color: #45475a" />
                  <div class="w-3/4 h-1 rounded-full" style="background-color: #45475a" />
                </div>
              </div>
            </div>
            <!-- Light half -->
            <div class="w-1/2 h-full flex">
              <div class="w-1/3 h-full" style="background-color: #f1f3f5" />
              <div class="flex-1 flex flex-col">
                <div class="h-2" style="background-color: #e9ecef" />
                <div class="flex-1 p-0.5" style="background-color: #ffffff">
                  <div class="w-full h-1 rounded-full mb-0.5" style="background-color: #dee2e6" />
                  <div class="w-3/4 h-1 rounded-full" style="background-color: #dee2e6" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <Monitor class="w-3.5 h-3.5" :class="modelValue === 'system' ? 'text-accent' : 'text-text-muted'" />
          <div class="text-center">
            <div class="text-xs font-medium" :class="modelValue === 'system' ? 'text-accent' : 'text-text'">
              System
            </div>
          </div>
        </div>
        <div class="text-xs text-text-muted">Match OS preference</div>

        <!-- Selected indicator -->
        <div
          v-if="modelValue === 'system'"
          class="w-4 h-4 rounded-full bg-accent flex items-center justify-center"
        >
          <Check class="w-2.5 h-2.5 text-white" :stroke-width="3" />
        </div>
      </button>
    </div>
  </div>
</template>
