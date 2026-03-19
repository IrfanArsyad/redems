import { ref, computed, reactive } from 'vue'

export interface EditorField {
  key: string
  label: string
  value: string
  type?: 'text' | 'textarea' | 'number'
  readonly?: boolean
}

export interface EditorEntry {
  id: string
  label: string
  fields: EditorField[]
}

export function useContentEditor() {
  const isOpen = ref(false)
  const isPinned = ref(false)
  const activeEntry = ref<EditorEntry | null>(null)
  const currentValues = reactive<Record<string, string>>({})
  const originalValues = reactive<Record<string, string>>({})

  const isDirty = computed(() => {
    if (!activeEntry.value) return false
    return activeEntry.value.fields.some(
      (f) => !f.readonly && currentValues[f.key] !== originalValues[f.key]
    )
  })

  function open(entry: EditorEntry): void {
    activeEntry.value = entry
    // Reset values
    for (const key of Object.keys(currentValues)) delete currentValues[key]
    for (const key of Object.keys(originalValues)) delete originalValues[key]
    for (const field of entry.fields) {
      currentValues[field.key] = field.value
      originalValues[field.key] = field.value
    }
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
    activeEntry.value = null
    for (const key of Object.keys(currentValues)) delete currentValues[key]
    for (const key of Object.keys(originalValues)) delete originalValues[key]
  }

  function switchTo(entry: EditorEntry): void {
    open(entry)
  }

  function updateField(key: string, value: string): void {
    currentValues[key] = value
  }

  function togglePin(): void {
    isPinned.value = !isPinned.value
  }

  function afterSave(): void {
    // Sync original values to current
    for (const key of Object.keys(currentValues)) {
      originalValues[key] = currentValues[key]
    }
    if (!isPinned.value) {
      close()
    }
  }

  return {
    isOpen,
    isPinned,
    activeEntry,
    currentValues,
    isDirty,
    open,
    close,
    switchTo,
    updateField,
    togglePin,
    afterSave
  }
}
