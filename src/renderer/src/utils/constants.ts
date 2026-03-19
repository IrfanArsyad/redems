export const REDIS_TYPES = [
  { value: 'string', label: 'String', color: '#a6e3a1' },
  { value: 'hash', label: 'Hash', color: '#89b4fa' },
  { value: 'list', label: 'List', color: '#fab387' },
  { value: 'set', label: 'Set', color: '#cba6f7' },
  { value: 'zset', label: 'Sorted Set', color: '#f38ba8' },
  { value: 'stream', label: 'Stream', color: '#89dceb' },
  { value: 'json', label: 'JSON', color: '#f9e2af' }
] as const

export const TTL_PRESETS = [
  { label: '1 min', value: 60 },
  { label: '5 min', value: 300 },
  { label: '1 hour', value: 3600 },
  { label: '1 day', value: 86400 },
  { label: '7 days', value: 604800 },
  { label: '30 days', value: 2592000 }
] as const

export const REDIS_COMMANDS = [
  'APPEND', 'AUTH', 'BGSAVE', 'BGREWRITEAOF', 'CLIENT', 'CLUSTER',
  'CONFIG', 'COPY', 'DBSIZE', 'DEBUG', 'DECR', 'DECRBY', 'DEL',
  'DISCARD', 'DUMP', 'ECHO', 'EVAL', 'EVALSHA', 'EXEC', 'EXISTS',
  'EXPIRE', 'EXPIREAT', 'FLUSHALL', 'FLUSHDB', 'GET', 'GETDEL',
  'GETEX', 'GETRANGE', 'GETSET', 'HDEL', 'HEXISTS', 'HGET',
  'HGETALL', 'HINCRBY', 'HINCRBYFLOAT', 'HKEYS', 'HLEN', 'HMGET',
  'HMSET', 'HRANDFIELD', 'HSCAN', 'HSET', 'HSETNX', 'HVALS',
  'INCR', 'INCRBY', 'INCRBYFLOAT', 'INFO', 'KEYS', 'LASTSAVE',
  'LINDEX', 'LINSERT', 'LLEN', 'LMOVE', 'LPOP', 'LPOS', 'LPUSH',
  'LPUSHX', 'LRANGE', 'LREM', 'LSET', 'LTRIM', 'MEMORY', 'MGET',
  'MIGRATE', 'MONITOR', 'MOVE', 'MSET', 'MSETNX', 'MULTI',
  'OBJECT', 'PERSIST', 'PEXPIRE', 'PEXPIREAT', 'PFADD', 'PFCOUNT',
  'PFMERGE', 'PING', 'PSETEX', 'PSUBSCRIBE', 'PTTL', 'PUBLISH',
  'PUBSUB', 'PUNSUBSCRIBE', 'QUIT', 'RANDOMKEY', 'RENAME',
  'RENAMENX', 'RESET', 'RESTORE', 'ROLE', 'RPOP', 'RPOPLPUSH',
  'RPUSH', 'RPUSHX', 'SADD', 'SAVE', 'SCAN', 'SCARD', 'SDIFF',
  'SDIFFSTORE', 'SELECT', 'SET', 'SETEX', 'SETNX', 'SETRANGE',
  'SHUTDOWN', 'SINTER', 'SINTERCARD', 'SINTERSTORE', 'SISMEMBER',
  'SLAVEOF', 'SLOWLOG', 'SMEMBERS', 'SMISMEMBER', 'SMOVE', 'SORT',
  'SORTRO', 'SPOP', 'SRANDMEMBER', 'SREM', 'SSCAN', 'STRLEN',
  'SUBSCRIBE', 'SUBSTR', 'SUNION', 'SUNIONSTORE', 'SWAPDB',
  'TIME', 'TOUCH', 'TTL', 'TYPE', 'UNLINK', 'UNSUBSCRIBE',
  'UNWATCH', 'WAIT', 'WATCH', 'XACK', 'XADD', 'XAUTOCLAIM',
  'XCLAIM', 'XDEL', 'XGROUP', 'XINFO', 'XLEN', 'XPENDING',
  'XRANGE', 'XREAD', 'XREADGROUP', 'XREVRANGE', 'XTRIM',
  'ZADD', 'ZCARD', 'ZCOUNT', 'ZDIFF', 'ZDIFFSTORE', 'ZINCRBY',
  'ZINTER', 'ZINTERCARD', 'ZINTERSTORE', 'ZLEXCOUNT', 'ZMPOP',
  'ZMSCORE', 'ZPOPMAX', 'ZPOPMIN', 'ZRANDMEMBER', 'ZRANGE',
  'ZRANGEBYLEX', 'ZRANGEBYSCORE', 'ZRANGESTORE', 'ZRANK', 'ZREM',
  'ZREMRANGEBYLEX', 'ZREMRANGEBYRANK', 'ZREMRANGEBYSCORE',
  'ZREVRANGE', 'ZREVRANGEBYLEX', 'ZREVRANGEBYSCORE', 'ZREVRANK',
  'ZSCAN', 'ZSCORE', 'ZUNION', 'ZUNIONSTORE'
] as const

export const DB_COUNT = 16

export const DEFAULT_SCAN_COUNT = 500

export const MAX_MONITOR_ENTRIES = 5000

export const MAX_PUBSUB_MESSAGES = 5000

export const DEBOUNCE_SEARCH_MS = 300
