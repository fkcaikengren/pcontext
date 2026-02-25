import type { DocSnippetsVO, DocVO } from './doc.vo'
import type { DocListQueryDTO, PaginationVO } from '@/client'
import type { ApiError, ApiSuccess } from '@/types'
import { z } from 'zod'
import { DocAddBodySchema, DocListQuerySchema, DocSnippetsQuerySchema, PositiveIntOptionalSchema } from '@/modules/doc/doc.dto'
import { getDocDetail, incrementDocAccess, listDocs, listFavoriteDocs, listLatestDocs, prepareDoc, queryDocSnippets, toggleFavorite } from '@/modules/doc/doc.service'
import { createRouter } from '@/shared/create-app'

import { Res200, Res201, Res400, Res401, Res404, Res409 } from '@/shared/utils/response-template'
import { getCurrentUserId } from '@/shared/utils/user'
import { jsonValidator, queryValidator } from '@/shared/utils/validator'

const router = createRouter()
  .get(
    '/',
    queryValidator(DocListQuerySchema),
    async (c) => {
      const { page, pageSize, name, source, createdFrom, createdTo, updatedFrom, updatedTo } = c.req.valid('query') as DocListQueryDTO
      const result = await listDocs(page, pageSize, { q: name, source, createdFrom, createdTo, updatedFrom, updatedTo })
      return c.json(Res200(result) as ApiSuccess<PaginationVO<DocVO>>, 200)
    },
  )
  .post('/', jsonValidator(DocAddBodySchema), async (c) => {
    const { url, source } = c.req.valid('json')

    const { slug, name, existing } = await prepareDoc(url, source)
    if (existing) {
      return c.json(Res409({ slug, name }, '文档已存在') as ApiError, 409)
    }
    const job = await c.var.taskService.submitTask('doc_index', {
      slug,
      name,
      url,
      source,
    })

    return c.json(Res201({ taskId: job.id, slug, name }, 'success'), 201)
  })
  .get(
    '/latest',
    queryValidator(z.object({ limit: PositiveIntOptionalSchema.default(10) })),
    async (c) => {
      const { limit } = c.req.valid('query')
      const result = await listLatestDocs(limit)
      return c.json(Res200(result) as ApiSuccess<DocVO[]>, 200)
    },
  )
  .get(
    '/favorites',
    queryValidator(DocListQuerySchema),
    async (c) => {
      const { page, pageSize } = c.req.valid('query')
      const userId = getCurrentUserId(c)
      const result = await listFavoriteDocs(userId as number, page, pageSize)
      return c.json(Res200(result) as ApiSuccess<PaginationVO<DocVO>>, 200)
    },
  )
  .get('/:slug', async (c) => {
    const { slug } = c.req.param()
    const doc = await getDocDetail(slug)
    if (!doc)
      return c.json(Res404(null, '文档不存在') as ApiError, 404)
    return c.json(Res200(doc) as ApiSuccess<DocVO>, 200)
  })
  .post('/:slug/favorite', jsonValidator(z.object({ like: z.boolean() })), async (c) => {
    const userId = getCurrentUserId(c)

    const { slug } = c.req.param()
    const { like } = c.req.valid('json')
    const ok = await toggleFavorite(userId as number, slug, like)
    return c.json(Res200({ favorite: ok }) as ApiSuccess, 200)
  })
  .post('/:slug/check', async (c) => {
    const { slug } = c.req.param()
    await incrementDocAccess(slug)
    return c.json(Res200({ ok: true }) as ApiSuccess, 200)
  })
  .get(
    '/:slug/query',
    queryValidator(DocSnippetsQuerySchema),
    async (c) => {
      const { slug } = c.req.param()
      const { topic, tokens } = c.req.valid('query')
      const decTopic = decodeURIComponent(topic)
      const result = await queryDocSnippets(slug, decTopic, tokens)
      return c.json(Res200(result) as ApiSuccess<DocSnippetsVO>, 200)
    },
  )

export default router
