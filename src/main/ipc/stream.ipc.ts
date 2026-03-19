// Stream IPC handlers are already registered in keys.ipc.ts
// This file exists for organizational clarity but delegates to the keys handler
// which handles all stream:* channels directly using Redis commands.

// If we need standalone stream handlers separate from keys.ipc.ts, they can be
// added here. Currently all stream operations are covered by keys.ipc.ts.
export {}
