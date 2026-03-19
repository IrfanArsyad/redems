import Redis from 'ioredis'
import type { RedisClusterInfo, RedisClusterNode } from '@shared/types/redis.types'

export class RedisClusterService {
  async getClusterInfo(redis: Redis): Promise<RedisClusterInfo> {
    const infoRaw = await redis.call('CLUSTER', 'INFO') as string
    const nodesRaw = await redis.call('CLUSTER', 'NODES') as string

    const info = this.parseClusterInfo(infoRaw)
    const nodes = this.parseClusterNodes(nodesRaw)

    return {
      state: info['cluster_state'] || 'unknown',
      slotsAssigned: parseInt(info['cluster_slots_assigned']) || 0,
      slotsOk: parseInt(info['cluster_slots_ok']) || 0,
      slotsPfail: parseInt(info['cluster_slots_pfail']) || 0,
      slotsFail: parseInt(info['cluster_slots_fail']) || 0,
      knownNodes: parseInt(info['cluster_known_nodes']) || 0,
      size: parseInt(info['cluster_size']) || 0,
      currentEpoch: parseInt(info['cluster_current_epoch']) || 0,
      myEpoch: parseInt(info['cluster_my_epoch']) || 0,
      nodes
    }
  }

  async getNodes(redis: Redis): Promise<RedisClusterNode[]> {
    const nodesRaw = await redis.call('CLUSTER', 'NODES') as string
    return this.parseClusterNodes(nodesRaw)
  }

  private parseClusterInfo(raw: string): Record<string, string> {
    const result: Record<string, string> = {}
    for (const line of raw.split('\r\n')) {
      const [key, value] = line.split(':')
      if (key && value) {
        result[key.trim()] = value.trim()
      }
    }
    return result
  }

  private parseClusterNodes(raw: string): RedisClusterNode[] {
    const nodes: RedisClusterNode[] = []
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      const parts = line.trim().split(' ')
      if (parts.length < 8) continue

      const flags = parts[2].split(',')
      const role = flags.includes('master') ? 'master' : 'slave'
      const masterRef = parts[3] === '-' ? null : parts[3]

      nodes.push({
        id: parts[0],
        address: parts[1].split('@')[0],
        flags,
        master: masterRef,
        pingSent: parseInt(parts[4]) || 0,
        pongRecv: parseInt(parts[5]) || 0,
        configEpoch: parseInt(parts[6]) || 0,
        linkState: parts[7],
        slots: parts.slice(8),
        role
      })
    }
    return nodes
  }
}
