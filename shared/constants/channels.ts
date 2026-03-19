// IPC Channel name constants - single source of truth
export const IPC = {
  // Connection
  CONNECTION_LIST: 'connection:list',
  CONNECTION_CREATE: 'connection:create',
  CONNECTION_UPDATE: 'connection:update',
  CONNECTION_DELETE: 'connection:delete',
  CONNECTION_CONNECT: 'connection:connect',
  CONNECTION_DISCONNECT: 'connection:disconnect',
  CONNECTION_TEST: 'connection:test',
  CONNECTION_STATUS: 'connection:status',

  // Keys
  KEYS_SCAN: 'keys:scan',
  KEYS_INFO: 'keys:info',
  KEYS_DELETE: 'keys:delete',
  KEYS_RENAME: 'keys:rename',
  KEYS_EXPIRE: 'keys:expire',
  KEYS_PERSIST: 'keys:persist',
  KEYS_TYPE: 'keys:type',
  KEYS_EXISTS: 'keys:exists',
  KEYS_CREATE: 'keys:create',
  KEYS_DUMP_RESTORE: 'keys:dump-restore',

  // String
  STRING_GET: 'string:get',
  STRING_SET: 'string:set',

  // Hash
  HASH_GETALL: 'hash:getall',
  HASH_HSCAN: 'hash:hscan',
  HASH_HSET: 'hash:hset',
  HASH_HDEL: 'hash:hdel',

  // List
  LIST_LRANGE: 'list:lrange',
  LIST_LSET: 'list:lset',
  LIST_LPUSH: 'list:lpush',
  LIST_RPUSH: 'list:rpush',
  LIST_LPOP: 'list:lpop',
  LIST_RPOP: 'list:rpop',
  LIST_LREM: 'list:lrem',
  LIST_LLEN: 'list:llen',

  // Set
  SET_SMEMBERS: 'set:smembers',
  SET_SSCAN: 'set:sscan',
  SET_SADD: 'set:sadd',
  SET_SREM: 'set:srem',
  SET_SCARD: 'set:scard',

  // Sorted Set
  ZSET_ZRANGE: 'zset:zrange',
  ZSET_ZSCAN: 'zset:zscan',
  ZSET_ZADD: 'zset:zadd',
  ZSET_ZREM: 'zset:zrem',
  ZSET_ZINCRBY: 'zset:zincrby',
  ZSET_ZCARD: 'zset:zcard',

  // Stream
  STREAM_XRANGE: 'stream:xrange',
  STREAM_XREVRANGE: 'stream:xrevrange',
  STREAM_XADD: 'stream:xadd',
  STREAM_XDEL: 'stream:xdel',
  STREAM_XTRIM: 'stream:xtrim',
  STREAM_XLEN: 'stream:xlen',
  STREAM_XINFO: 'stream:xinfo',
  STREAM_GROUPS: 'stream:groups',
  STREAM_CONSUMERS: 'stream:consumers',
  STREAM_PENDING: 'stream:pending',
  STREAM_GROUP_CREATE: 'stream:group-create',
  STREAM_GROUP_DESTROY: 'stream:group-destroy',
  STREAM_XACK: 'stream:xack',

  // CLI
  CLI_EXECUTE: 'cli:execute',

  // Server
  SERVER_INFO: 'server:info',
  SERVER_CONFIG_GET: 'server:config-get',
  SERVER_CONFIG_SET: 'server:config-set',
  SERVER_CLIENTS: 'server:clients',
  SERVER_CLIENT_KILL: 'server:client-kill',
  SERVER_SLOWLOG: 'server:slowlog',
  SERVER_DBSIZE: 'server:dbsize',
  SERVER_FLUSHDB: 'server:flushdb',
  SERVER_SELECT_DB: 'server:select-db',

  // Cluster
  CLUSTER_INFO: 'cluster:info',
  CLUSTER_NODES: 'cluster:nodes',

  // PubSub
  PUBSUB_SUBSCRIBE: 'pubsub:subscribe',
  PUBSUB_PSUBSCRIBE: 'pubsub:psubscribe',
  PUBSUB_UNSUBSCRIBE: 'pubsub:unsubscribe',
  PUBSUB_PUNSUBSCRIBE: 'pubsub:punsubscribe',
  PUBSUB_PUBLISH: 'pubsub:publish',
  PUBSUB_MESSAGE: 'pubsub:message',

  // Monitor
  MONITOR_START: 'monitor:start',
  MONITOR_STOP: 'monitor:stop',
  MONITOR_DATA: 'monitor:data',

  // Memory
  MEMORY_ANALYZE: 'memory:analyze',
  MEMORY_PROGRESS: 'memory:progress',

  // Import/Export
  EXPORT_KEYS: 'export:keys',
  IMPORT_FILE: 'import:file',

  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  WINDOW_MAXIMIZED_CHANGED: 'window:maximized-changed'
} as const
