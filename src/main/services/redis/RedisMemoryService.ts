import Redis from 'ioredis'
import type { MemoryAnalysisResult, RedisDataType } from '@shared/types/redis.types'
import { logger } from '../../utils/logger'

export class RedisMemoryService {
  private progressCallback: ((scanned: number, total: number) => void) | null = null

  setProgressCallback(cb: (scanned: number, total: number) => void): void {
    this.progressCallback = cb
  }

  async analyze(
    redis: Redis,
    pattern: string,
    sampleSize: number
  ): Promise<MemoryAnalysisResult> {
    const result: MemoryAnalysisResult = {
      totalKeys: 0,
      totalMemory: 0,
      scannedKeys: 0,
      topKeys: [],
      byNamespace: {},
      byType: {}
    }

    const dbSize = await redis.dbsize()
    result.totalKeys = dbSize

    let cursor = '0'
    let scanned = 0
    const batchSize = 100

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        batchSize
      )
      cursor = nextCursor

      if (keys.length === 0) continue

      // Pipeline to get TYPE and MEMORY USAGE for each key
      const pipeline = redis.pipeline()
      for (const key of keys) {
        pipeline.type(key)
        pipeline.call('MEMORY', 'USAGE', key)
      }

      const results = await pipeline.exec()
      if (!results) continue

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const typeResult = results[i * 2]
        const memResult = results[i * 2 + 1]

        const type = (typeResult?.[1] as string) || 'unknown'
        const memory = (memResult?.[1] as number) || 0

        scanned++
        result.scannedKeys = scanned
        result.totalMemory += memory

        // Track top keys
        result.topKeys.push({ key, memory, type: type as RedisDataType })
        result.topKeys.sort((a, b) => b.memory - a.memory)
        if (result.topKeys.length > 100) {
          result.topKeys = result.topKeys.slice(0, 100)
        }

        // Aggregate by namespace (first segment before :)
        const colonIdx = key.indexOf(':')
        const namespace = colonIdx > 0 ? key.substring(0, colonIdx) : '(root)'
        if (!result.byNamespace[namespace]) {
          result.byNamespace[namespace] = { count: 0, memory: 0 }
        }
        result.byNamespace[namespace].count++
        result.byNamespace[namespace].memory += memory

        // Aggregate by type
        if (!result.byType[type]) {
          result.byType[type] = { count: 0, memory: 0 }
        }
        result.byType[type].count++
        result.byType[type].memory += memory
      }

      this.progressCallback?.(scanned, Math.max(dbSize, scanned))

      if (sampleSize > 0 && scanned >= sampleSize) break
    } while (cursor !== '0')

    // Final top keys trim
    result.topKeys = result.topKeys.slice(0, 20)

    logger.info(`Memory analysis complete: ${scanned} keys scanned, ${result.totalMemory} bytes total`)
    return result
  }
}
