import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeSetting = 'dark' | 'light' | 'system'

export interface AppSettings {
  theme: ThemeSetting
  keySeparator: string
  scanCount: number
  fontSize: number
  cliHistorySize: number
  autoRefreshInterval: number
  maxMonitorEntries: number
  dateFormat: string
}

const STORAGE_KEY = 'redis-manager:settings'

function loadFromLocalStorage(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // Ignore parse errors, return defaults
  }
  return {}
}

function saveToLocalStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadFromLocalStorage()

  // State
  const theme = ref<ThemeSetting>(saved.theme ?? 'dark')
  const keySeparator = ref<string>(saved.keySeparator ?? ':')
  const scanCount = ref<number>(saved.scanCount ?? 500)
  const fontSize = ref<number>(saved.fontSize ?? 13)
  const cliHistorySize = ref<number>(saved.cliHistorySize ?? 1000)
  const autoRefreshInterval = ref<number>(saved.autoRefreshInterval ?? 0)
  const maxMonitorEntries = ref<number>(saved.maxMonitorEntries ?? 5000)
  const dateFormat = ref<string>(saved.dateFormat ?? 'YYYY-MM-DD HH:mm:ss')

  // Persist to localStorage on any change
  function getAllSettings(): AppSettings {
    return {
      theme: theme.value,
      keySeparator: keySeparator.value,
      scanCount: scanCount.value,
      fontSize: fontSize.value,
      cliHistorySize: cliHistorySize.value,
      autoRefreshInterval: autoRefreshInterval.value,
      maxMonitorEntries: maxMonitorEntries.value,
      dateFormat: dateFormat.value
    }
  }

  function persist(): void {
    saveToLocalStorage(getAllSettings())
  }

  // Watch all settings for changes and persist
  watch(
    [theme, keySeparator, scanCount, fontSize, cliHistorySize, autoRefreshInterval, maxMonitorEntries, dateFormat],
    () => {
      persist()
    }
  )

  // Actions
  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    switch (key) {
      case 'theme':
        theme.value = value as ThemeSetting
        break
      case 'keySeparator':
        keySeparator.value = value as string
        break
      case 'scanCount':
        scanCount.value = value as number
        break
      case 'fontSize':
        fontSize.value = value as number
        break
      case 'cliHistorySize':
        cliHistorySize.value = value as number
        break
      case 'autoRefreshInterval':
        autoRefreshInterval.value = value as number
        break
      case 'maxMonitorEntries':
        maxMonitorEntries.value = value as number
        break
      case 'dateFormat':
        dateFormat.value = value as string
        break
    }
  }

  function applyTheme(): void {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function apply(): void {
      if (theme.value === 'system') {
        if (mediaQuery.matches) {
          root.classList.remove('light')
        } else {
          root.classList.add('light')
        }
      } else if (theme.value === 'light') {
        root.classList.add('light')
      } else {
        root.classList.remove('light')
      }

      // Apply font size to root
      root.style.fontSize = `${fontSize.value}px`
    }

    apply()

    // Listen for system theme changes when theme is 'system'
    mediaQuery.addEventListener('change', () => {
      if (theme.value === 'system') {
        apply()
      }
    })
  }

  return {
    // State
    theme,
    keySeparator,
    scanCount,
    fontSize,
    cliHistorySize,
    autoRefreshInterval,
    maxMonitorEntries,
    dateFormat,

    // Actions
    updateSetting,
    applyTheme,
    getAllSettings
  }
})
