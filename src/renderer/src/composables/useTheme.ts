import { computed, watch, onUnmounted } from 'vue'
import { useSettingsStore } from '@renderer/stores/settings.store'

export function useTheme() {
  const settingsStore = useSettingsStore()

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const currentTheme = computed(() => {
    if (settingsStore.theme === 'system') {
      return mediaQuery.matches ? 'dark' : 'light'
    }
    return settingsStore.theme
  })

  const isDark = computed(() => currentTheme.value === 'dark')

  function applyThemeClass(): void {
    const root = document.documentElement
    if (currentTheme.value === 'light') {
      root.classList.add('light')
    } else {
      root.classList.remove('light')
    }
  }

  function toggleTheme(): void {
    const newTheme = isDark.value ? 'light' : 'dark'
    settingsStore.updateSetting('theme', newTheme)
  }

  function setTheme(theme: 'dark' | 'light' | 'system'): void {
    settingsStore.updateSetting('theme', theme)
  }

  // Handle system preference changes when theme is set to 'system'
  function onSystemThemeChange(): void {
    if (settingsStore.theme === 'system') {
      applyThemeClass()
    }
  }

  mediaQuery.addEventListener('change', onSystemThemeChange)

  // Watch for theme setting changes and re-apply
  watch(
    () => settingsStore.theme,
    () => {
      applyThemeClass()
    }
  )

  onUnmounted(() => {
    mediaQuery.removeEventListener('change', onSystemThemeChange)
  })

  return {
    currentTheme,
    isDark,
    toggleTheme,
    setTheme,
    applyThemeClass
  }
}
