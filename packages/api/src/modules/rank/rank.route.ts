import type { RankedDocVO } from './rank.vo'
import type { DocEntity } from '@/modules/doc/doc.entity'
import type { ApiError, ApiSuccess } from '@/shared/types'
import { createRouter } from '@/shared/create-app'
import { getRepoDeps, getServiceDeps } from '@/shared/deps'
import { Res200, Res400 } from '@/shared/utils/response-template'
import { getCurrentUserId } from '@/shared/utils/user'
import { queryValidator } from '@/shared/utils/validator'
import { RankDocsQuerySchema } from './rank.dto'

function toDocVO(entity: DocEntity<Date>) {
  return {
    ...entity,
    createdAt: entity.createdAt.getTime(),
    updatedAt: entity.updatedAt.getTime(),
  }
}

const router = createRouter()
  .get('/docs', queryValidator(RankDocsQuerySchema), async (c) => {
    const { limit } = c.req.valid('query')
    const { rankService } = getServiceDeps()
    const { docRepo } = getRepoDeps()
    const userId = getCurrentUserId(c)

    // TODO: 优化，批量查询文档
    const ranked = await rankService.getRankedDocs(limit)
    const docs = await Promise.all(ranked.map(async ({ slug, score }) => {
      const doc = await docRepo.findBySlugWithCache(slug)
      if (!doc)
        return null
      return { ...toDocVO(doc), score } satisfies RankedDocVO
    }))

    const validDocs = docs.filter((v): v is RankedDocVO => Boolean(v))

    if (userId) {
      const docIds = validDocs.map(d => d.id)
      const favoritePromises = docIds.map(docId => docRepo.isFavorite(userId, docId))
      const favoriteResults = await Promise.all(favoritePromises)

      return c.json(Res200({ docs: validDocs.map((doc, index) => ({
        ...doc,
        starred: favoriteResults[index],
      })) }) as ApiSuccess<{ docs: RankedDocVO[] }>, 200)
    }

    return c.json(Res200({ docs: validDocs }) as ApiSuccess<{ docs: RankedDocVO[] }>, 200)
  })

export default router
