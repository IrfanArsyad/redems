import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PubSubMessage } from '@shared/types/redis.types'
import { IPC } from '@shared/constants/channels'

const MAX_MESSAGES = 5000

export interface Subscription {
  channel: string
  isPattern: boolean
}

export const usePubSubStore = defineStore('pubsub', () => {
  // State
  const subscriptions = ref<Subscription[]>([])
  const messages = ref<PubSubMessage[]>([])
  const paused = ref<boolean>(false)
  const messageCount = ref<number>(0)

  let unsubListener: (() => void) | null = null

  // Getters
  const channelMessageCounts = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const msg of messages.value) {
      counts[msg.channel] = (counts[msg.channel] || 0) + 1
    }
    return counts
  })

  const uniqueChannels = computed<string[]>(() => {
    const channels = new Set<string>()
    for (const msg of messages.value) {
      channels.add(msg.channel)
    }
    return Array.from(channels)
  })

  // Ring buffer push
  function pushMessage(msg: PubSubMessage): void {
    if (paused.value) return
    messages.value.push(msg)
    messageCount.value++
    if (messages.value.length > MAX_MESSAGES) {
      messages.value = messages.value.slice(messages.value.length - MAX_MESSAGES)
    }
  }

  // Initialize event listener
  function initListener(): void {
    if (unsubListener) return
    unsubListener = window.api.on(IPC.PUBSUB_MESSAGE, (msg: PubSubMessage) => {
      pushMessage(msg)
    })
  }

  // Actions
  async function subscribe(connId: string, channel: string): Promise<void> {
    try {
      initListener()
      await window.api.invoke(IPC.PUBSUB_SUBSCRIBE, connId, [channel])
      const exists = subscriptions.value.find(
        (s) => s.channel === channel && !s.isPattern
      )
      if (!exists) {
        subscriptions.value.push({ channel, isPattern: false })
      }
    } catch (err) {
      console.error('Failed to subscribe:', err)
      throw err
    }
  }

  async function psubscribe(connId: string, pattern: string): Promise<void> {
    try {
      initListener()
      await window.api.invoke(IPC.PUBSUB_PSUBSCRIBE, connId, [pattern])
      const exists = subscriptions.value.find(
        (s) => s.channel === pattern && s.isPattern
      )
      if (!exists) {
        subscriptions.value.push({ channel: pattern, isPattern: true })
      }
    } catch (err) {
      console.error('Failed to psubscribe:', err)
      throw err
    }
  }

  async function unsubscribe(connId: string, channel: string): Promise<void> {
    try {
      await window.api.invoke(IPC.PUBSUB_UNSUBSCRIBE, connId, [channel])
      subscriptions.value = subscriptions.value.filter(
        (s) => !(s.channel === channel && !s.isPattern)
      )
    } catch (err) {
      console.error('Failed to unsubscribe:', err)
      throw err
    }
  }

  async function punsubscribe(connId: string, pattern: string): Promise<void> {
    try {
      await window.api.invoke(IPC.PUBSUB_PUNSUBSCRIBE, connId, [pattern])
      subscriptions.value = subscriptions.value.filter(
        (s) => !(s.channel === pattern && s.isPattern)
      )
    } catch (err) {
      console.error('Failed to punsubscribe:', err)
      throw err
    }
  }

  async function publish(connId: string, channel: string, message: string): Promise<number> {
    try {
      return await window.api.invoke(IPC.PUBSUB_PUBLISH, connId, channel, message)
    } catch (err) {
      console.error('Failed to publish:', err)
      throw err
    }
  }

  function clearMessages(): void {
    messages.value = []
    messageCount.value = 0
  }

  function togglePause(): void {
    paused.value = !paused.value
  }

  function $dispose(): void {
    if (unsubListener) {
      unsubListener()
      unsubListener = null
    }
  }

  return {
    // State
    subscriptions,
    messages,
    paused,
    messageCount,

    // Getters
    channelMessageCounts,
    uniqueChannels,

    // Actions
    subscribe,
    psubscribe,
    unsubscribe,
    punsubscribe,
    publish,
    clearMessages,
    togglePause,
    $dispose
  }
})
