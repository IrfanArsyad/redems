# Redems - Redis Manager

A professional Redis management desktop application built with Electron, Vue 3, and TypeScript.

## Features

- **Connection Management** — Create, edit, test, and manage multiple Redis connections with SSH tunnel support
- **Key Browser** — Scan, search, filter, and manage Redis keys across all data types
- **Data Editors** — Dedicated editors for String, Hash, List, Set, Sorted Set, and Stream types
- **Export Table Data** — Export data from Hash, List, Set, ZSet, and Stream editors as CSV or JSON files
- **CLI Shell** — Built-in Redis CLI with command auto-complete
- **PubSub** — Subscribe to channels/patterns and publish messages in real-time
- **Monitor** — Live monitoring of all Redis commands hitting the server
- **Server Info** — View server stats, connected clients, slow log, and configuration
- **Cluster Support** — View cluster info and node topology
- **Memory Analysis** — Analyze key memory usage with sampling
- **Import/Export Keys** — Import and export keys in JSON, CSV, or Redis command format
- **Dump/Restore** — Transfer keys between connections using DUMP/RESTORE

## Tech Stack

- **Electron** — Desktop runtime
- **Vue 3** — UI framework (Composition API + `<script setup>`)
- **TypeScript** — Type-safe codebase
- **Tailwind CSS** — Utility-first styling with custom dark theme
- **Pinia** — State management
- **ioredis** — Redis client
- **Lucide** — Icon set

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── ipc/        # IPC handlers
│   └── services/   # Redis, SSH, storage services
├── preload/        # Context bridge
├── renderer/       # Vue 3 frontend
│   └── src/
│       ├── assets/       # Styles & variables
│       ├── components/   # UI components
│       ├── composables/  # Reusable logic
│       ├── stores/       # Pinia stores
│       ├── utils/        # Utility functions
│       └── views/        # Page views
shared/
└── types/          # Shared TypeScript types
```

## License

MIT
