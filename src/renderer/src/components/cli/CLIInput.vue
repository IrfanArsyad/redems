<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useCLIStore } from '@renderer/stores/cli.store'
import { Loader2 } from 'lucide-vue-next'

defineProps<{
  connectionId: string
}>()

const emit = defineEmits<{
  execute: [command: string]
}>()

const cliStore = useCLIStore()

const inputRef = ref<HTMLInputElement | null>(null)
const localInput = ref<string>('')
const showAutocomplete = ref<boolean>(false)
const autocompleteIndex = ref<number>(0)

// Common Redis commands for autocomplete (50+)
const REDIS_COMMANDS: string[] = [
  'APPEND', 'AUTH', 'BGSAVE', 'BGREWRITEAOF', 'BITCOUNT', 'BITOP', 'BITPOS',
  'BLPOP', 'BRPOP', 'BRPOPLPUSH',
  'CLIENT', 'CLUSTER', 'COMMAND', 'CONFIG', 'COPY',
  'DBSIZE', 'DEBUG', 'DECR', 'DECRBY', 'DEL', 'DISCARD', 'DUMP',
  'ECHO', 'EVAL', 'EVALSHA', 'EXEC', 'EXISTS', 'EXPIRE', 'EXPIREAT', 'EXPIRETIME',
  'FLUSHALL', 'FLUSHDB',
  'GEOADD', 'GEODIST', 'GEOHASH', 'GEOPOS', 'GEORADIUS', 'GEOSEARCH', 'GET',
  'GETDEL', 'GETEX', 'GETRANGE', 'GETSET',
  'HDEL', 'HEXISTS', 'HGET', 'HGETALL', 'HINCRBY', 'HINCRBYFLOAT', 'HKEYS',
  'HLEN', 'HMGET', 'HMSET', 'HSCAN', 'HSET', 'HSETNX', 'HVALS',
  'INCR', 'INCRBY', 'INCRBYFLOAT', 'INFO',
  'KEYS',
  'LASTSAVE', 'LINDEX', 'LINSERT', 'LLEN', 'LMOVE', 'LPOP', 'LPOS', 'LPUSH',
  'LPUSHX', 'LRANGE', 'LREM', 'LSET', 'LTRIM',
  'MEMORY', 'MGET', 'MIGRATE', 'MONITOR', 'MOVE', 'MSET', 'MSETNX', 'MULTI',
  'OBJECT', 'PERSIST', 'PEXPIRE', 'PEXPIREAT', 'PFADD', 'PFCOUNT', 'PFMERGE',
  'PING', 'PSETEX', 'PSUBSCRIBE', 'PTTL', 'PUBLISH', 'PUBSUB', 'PUNSUBSCRIBE',
  'QUIT',
  'RANDOMKEY', 'RENAME', 'RENAMENX', 'RESTORE', 'ROLE', 'RPOP', 'RPOPLPUSH',
  'RPUSH', 'RPUSHX',
  'SADD', 'SAVE', 'SCAN', 'SCARD', 'SCRIPT', 'SELECT', 'SET', 'SETEX', 'SETNX',
  'SETRANGE', 'SHUTDOWN', 'SINTER', 'SINTERSTORE', 'SISMEMBER', 'SLAVEOF',
  'SLOWLOG', 'SMEMBERS', 'SMOVE', 'SORT', 'SPOP', 'SRANDMEMBER', 'SREM',
  'SSCAN', 'STRLEN', 'SUBSCRIBE', 'SUNION', 'SUNIONSTORE', 'SWAPDB',
  'TIME', 'TOUCH', 'TTL', 'TYPE',
  'UNLINK', 'UNSUBSCRIBE', 'UNWATCH',
  'WAIT', 'WATCH',
  'XACK', 'XADD', 'XCLAIM', 'XDEL', 'XGROUP', 'XINFO', 'XLEN', 'XPENDING',
  'XRANGE', 'XREAD', 'XREADGROUP', 'XREVRANGE', 'XTRIM',
  'ZADD', 'ZCARD', 'ZCOUNT', 'ZDIFF', 'ZDIFFSTORE', 'ZINCRBY', 'ZINTER',
  'ZINTERSTORE', 'ZLEXCOUNT', 'ZMSCORE', 'ZPOPMAX', 'ZPOPMIN', 'ZRANDMEMBER',
  'ZRANGE', 'ZRANGEBYLEX', 'ZRANGEBYSCORE', 'ZRANGESTORE', 'ZRANK', 'ZREM',
  'ZREMRANGEBYLEX', 'ZREMRANGEBYRANK', 'ZREMRANGEBYSCORE', 'ZREVRANGE',
  'ZREVRANGEBYLEX', 'ZREVRANGEBYSCORE', 'ZREVRANK', 'ZSCAN', 'ZSCORE',
  'ZUNION', 'ZUNIONSTORE'
]

const filteredCommands = computed<string[]>(() => {
  const input = localInput.value.trim().toUpperCase()
  if (!input) return REDIS_COMMANDS.slice(0, 20)

  // Only autocomplete first token (the command itself)
  const firstToken = input.split(/\s+/)[0]
  if (input.includes(' ')) return [] // Already typing args, no autocomplete

  return REDIS_COMMANDS.filter((cmd) => cmd.startsWith(firstToken)).slice(0, 15)
})

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    if (showAutocomplete.value && filteredCommands.value.length > 0) {
      // Accept autocomplete selection
      acceptAutocomplete(filteredCommands.value[autocompleteIndex.value])
      event.preventDefault()
      return
    }
    event.preventDefault()
    submitCommand()
    return
  }

  if (event.key === 'Tab') {
    event.preventDefault()
    if (showAutocomplete.value && filteredCommands.value.length > 0) {
      // Accept current autocomplete selection
      acceptAutocomplete(filteredCommands.value[autocompleteIndex.value])
    } else if (!showAutocomplete.value) {
      // Open autocomplete
      showAutocomplete.value = true
      autocompleteIndex.value = 0
    }
    return
  }

  if (event.key === 'Escape') {
    if (showAutocomplete.value) {
      showAutocomplete.value = false
      event.preventDefault()
      return
    }
    return
  }

  if (showAutocomplete.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      autocompleteIndex.value = Math.min(
        autocompleteIndex.value + 1,
        filteredCommands.value.length - 1
      )
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      autocompleteIndex.value = Math.max(autocompleteIndex.value - 1, 0)
      return
    }
  } else {
    // Command history navigation (only when autocomplete is hidden)
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const cmd = cliStore.navigateHistory('up')
      localInput.value = cmd
      nextTick(() => {
        if (inputRef.value) {
          inputRef.value.selectionStart = inputRef.value.selectionEnd = localInput.value.length
        }
      })
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const cmd = cliStore.navigateHistory('down')
      localInput.value = cmd
      nextTick(() => {
        if (inputRef.value) {
          inputRef.value.selectionStart = inputRef.value.selectionEnd = localInput.value.length
        }
      })
      return
    }
  }

  if (event.key === 'c' && event.ctrlKey) {
    event.preventDefault()
    localInput.value = ''
    showAutocomplete.value = false
    return
  }
}

function handleInput(): void {
  // If autocomplete is open, update filtered results
  if (showAutocomplete.value) {
    autocompleteIndex.value = 0
    if (filteredCommands.value.length === 0) {
      showAutocomplete.value = false
    }
  }
}

function acceptAutocomplete(command: string): void {
  localInput.value = command.toLowerCase() + ' '
  showAutocomplete.value = false
  autocompleteIndex.value = 0
  nextTick(() => {
    inputRef.value?.focus()
  })
}

function submitCommand(): void {
  const command = localInput.value.trim()
  if (!command) return

  emit('execute', command)
  localInput.value = ''
  showAutocomplete.value = false
}

function handleClickOutside(event: MouseEvent): void {
  const target = event.target as HTMLElement
  if (!target.closest('.cli-autocomplete') && !target.closest('.cli-input-wrapper')) {
    showAutocomplete.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  nextTick(() => {
    inputRef.value?.focus()
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="relative cli-input-wrapper">
    <!-- Autocomplete dropdown (appears above input) -->
    <div
      v-if="showAutocomplete && filteredCommands.length > 0"
      class="cli-autocomplete absolute bottom-full left-0 right-0 max-h-48 overflow-y-auto bg-surface-0 border border-border rounded-t-md shadow-lg z-50 py-1"
    >
      <div
        v-for="(cmd, idx) in filteredCommands"
        :key="cmd"
        @mousedown.prevent="acceptAutocomplete(cmd)"
        class="px-3 py-1.5 text-xs font-mono cursor-pointer transition-colors"
        :class="
          idx === autocompleteIndex
            ? 'bg-accent-muted text-accent'
            : 'text-text hover:bg-overlay-0'
        "
      >
        {{ cmd }}
      </div>
    </div>

    <!-- Input row -->
    <div class="flex items-center bg-input-bg px-3 py-1.5">
      <span class="text-accent font-mono text-xs mr-2 shrink-0 select-none">&gt;</span>
      <input
        ref="inputRef"
        v-model="localInput"
        @keydown="handleKeydown"
        @input="handleInput"
        type="text"
        class="flex-1 bg-transparent text-text font-mono text-xs outline-none placeholder:text-text-muted"
        placeholder="Enter Redis command..."
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
      />
      <div v-if="cliStore.loading" class="ml-2 shrink-0">
        <Loader2 class="w-3.5 h-3.5 text-accent animate-spin" />
      </div>
    </div>
  </div>
</template>
