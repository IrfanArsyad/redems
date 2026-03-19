export interface Tab {
  id: string
  title: string
  type: 'keys' | 'server' | 'cli' | 'monitor' | 'pubsub' | 'stream' | 'cluster' | 'settings'
  connectionId?: string
  icon?: string
}

export interface TreeNode {
  key: string
  label: string
  isLeaf: boolean
  children?: TreeNode[]
  expanded?: boolean
  type?: string
  ttl?: number
  childCount?: number
  fullPath?: string
}

export type ViewMode = 'tree' | 'list'

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}
