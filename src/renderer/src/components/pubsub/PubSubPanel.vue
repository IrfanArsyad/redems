<script setup lang="ts">
import { computed } from 'vue'
import { usePubSubStore } from '@renderer/stores/pubsub.store'
import ChannelSubscriber from '@renderer/components/pubsub/ChannelSubscriber.vue'
import MessagePublisher from '@renderer/components/pubsub/MessagePublisher.vue'
import MessageList from '@renderer/components/pubsub/MessageList.vue'

const props = defineProps<{
  connectionId: string
}>()

const pubsubStore = usePubSubStore()

const messages = computed(() => pubsubStore.messages)
</script>

<template>
  <div class="flex flex-col h-full bg-base">
    <!-- Top: Message Publisher -->
    <div class="border-b border-border">
      <MessagePublisher :connection-id="props.connectionId" />
    </div>

    <!-- Split layout: left channels, right messages -->
    <div class="flex flex-1 min-h-0">
      <!-- Left: Channel Subscriber -->
      <div class="w-72 shrink-0 border-r border-border overflow-hidden">
        <ChannelSubscriber :connection-id="props.connectionId" />
      </div>

      <!-- Right: Message List -->
      <div class="flex-1 min-w-0 overflow-hidden">
        <MessageList :messages="messages" />
      </div>
    </div>
  </div>
</template>
