import type { RankedDocVO } from './rank.vo'
import type { ApiSuccess } from '@/shared/types'
import { createRouter } from '@/shared/create-app'
import { getServiceDeps } from '@/shared/deps'
import { Res200 } from '@/shared/utils/response-template'
import { getCurrentUserId } from '@/shared/utils/user'
import { queryValidator } from '@/shared/utils/validator'
import { RankDocsQuerySchema } from './rank.dto'

const router = createRouter()
  .get('/docs', queryValidator(RankDocsQuerySchema), async (c) => {
    const { limit } = c.req.valid('query')
    const { rankService } = getServiceDeps()
    const userId = getCurrentUserId(c)

    const docs = await rankService.getRankedDocsWithDetails(limit, userId)

    return c.json(Res200({ docs }) as ApiSuccess<{ docs: RankedDocVO[] }>, 200)
  })

export default router
