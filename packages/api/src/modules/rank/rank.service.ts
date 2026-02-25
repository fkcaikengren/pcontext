import { logger } from '@/shared/logger'
import { redis } from '@/shared/redis'

const RANK_DOCS_ALL_TIME_KEY = 'rank:docs:all_time'

export class RankService {
  async incrementDocScore(slug: string, weight: number): Promise<void> {
    if (!slug)
      return
    try {
      await redis.zincrby(RANK_DOCS_ALL_TIME_KEY, weight, slug)
    }
    catch (error: any) {
      logger.error(`Redis ZINCRBY failed: ${error?.message || 'unknown error'}`)
    }
  }

  async getRankedDocs(limit: number = 10): Promise<{ slug: string, score: number }[]> {
    if (limit <= 0)
      return []
    try {
      const raw = await redis.zrevrange(RANK_DOCS_ALL_TIME_KEY, 0, limit - 1, 'WITHSCORES')
      const results: { slug: string, score: number }[] = []
      for (let i = 0; i < raw.length; i += 2) {
        const slug = raw[i]
        const score = Number(raw[i + 1] ?? 0)
        if (slug)
          results.push({ slug, score })
      }
      return results
    }
    catch (error: any) {
      logger.error(`Redis ZREVRANGE failed: ${error?.message || 'unknown error'}`)
      return []
    }
  }
}
