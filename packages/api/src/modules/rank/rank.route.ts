import type { RankedDocVO } from './rank.vo'
import type { DocEntity } from '@/modules/doc/doc.entity'
import type { ApiError, ApiSuccess } from '@/types'
import { createRouter } from '@/shared/create-app'
import { getRepoDeps, getServiceDeps } from '@/shared/deps'
import { Res200, Res400 } from '@/shared/utils/response-template'
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

    // TODO: 优化，批量查询文档
    const ranked = await rankService.getRankedDocs(limit)
    const docs = await Promise.all(ranked.map(async ({ slug, score }) => {
      const doc = await docRepo.findBySlugWithCache(slug)
      if (!doc)
        return null
      return { ...toDocVO(doc), score } satisfies RankedDocVO
    }))

    return c.json(Res200({ docs: docs.filter((v): v is RankedDocVO => Boolean(v)) }) as ApiSuccess<{ docs: RankedDocVO[] }>, 200)
  })

export default router
