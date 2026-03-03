import type { RankedDocVO } from './rank.vo'
import type { DocEntity } from '@/modules/doc/doc.entity'
import type { IDocRepository } from '@/modules/doc/doc.repo.interface'
import { getRedis } from '@/shared/redis'
import { Cache, CacheableService } from '@/shared/redis/decorator'

const RANK_DOCS_ALL_TIME_KEY = 'rank:docs:all_time'

function toDocVO(entity: DocEntity<Date>) {
  return {
    ...entity,
    createdAt: entity.createdAt.getTime(),
    updatedAt: entity.updatedAt.getTime(),
  }
}

@CacheableService('rank')
export class RankService {
  private get cache() {
    return getRedis()
  }

  constructor(private docRepo: IDocRepository) {}

  /**
   * 批量查询文档收藏状态（带缓存）
   * @param userId 用户 ID
   * @param docIds 文档 ID 列表
   * @returns docId -> 是否收藏的映射
   */
  @Cache({ key: userId => `getFavoritesMap:${userId}`, tags: userId => [`favorites:${userId}`], ttl: 600 })
  async getFavoritesMap(userId: number, docIds: number[]): Promise<{ [docId: number]: boolean }> {
    if (docIds.length === 0)
      return {}

    const favoritePromises = docIds.map(docId => this.docRepo.isFavorite(userId, docId))
    const favoriteResults = await Promise.all(favoritePromises)

    const map: { [docId: number]: boolean } = {}
    docIds.forEach((docId, index) => {
      map[docId] = favoriteResults[index]
    })
    return map
  }

  async incrementDocScore(slug: string, weight: number): Promise<void> {
    if (!slug)
      return
    await this.cache.zincrby(RANK_DOCS_ALL_TIME_KEY, weight, slug)
  }

  async getRankedDocs(limit: number = 10): Promise<{ slug: string, score: number }[]> {
    if (limit <= 0)
      return []
    const raw = await this.cache.zrevrange(RANK_DOCS_ALL_TIME_KEY, 0, limit - 1, 'WITHSCORES')

    const results: { slug: string, score: number }[] = []
    for (let i = 0; i < raw.length; i += 2) {
      const slug = raw[i]
      const score = Number(raw[i + 1] ?? 0)
      if (slug)
        results.push({ slug, score })
    }
    return results
  }

  /**
   * 获取排序文档列表
   * @param limit 返回数量限制
   * @param userId 可选用户 ID，用于检查收藏状态
   */
  async getRankedDocsWithDetails(limit: number, userId?: number): Promise<RankedDocVO[]> {
    const ranked = await this.getRankedDocs(limit)

    // TODO: 优化，加redis缓存
    const docs = await Promise.all(ranked.map(async ({ slug, score }) => {
      const doc = await this.docRepo.findBySlug(slug)
      if (!doc)
        return null
      return { ...toDocVO(doc), score } satisfies RankedDocVO
    }))

    const validDocs = docs.filter((v): v is RankedDocVO => Boolean(v))

    if (userId) {
      const docIds = validDocs.map(d => d.id)
      const favoritesMap = await this.getFavoritesMap(userId, docIds)

      return validDocs.map(doc => ({
        ...doc,
        starred: favoritesMap[doc.id] ?? false,
      }))
    }

    return validDocs
  }
}
