import type { ApiError, ApiSuccess } from '@/types'
import { z } from 'zod'
import { DocAddBodySchema, DocListQuerySchema, PositiveIntOptionalSchema } from '@/modules/doc/doc.dto'
import { generateLlmText, getDocDetail, incrementDocAccess, indexGitDoc, listDocs, prepareGitDoc, queryDocSnippets, toggleFavorite } from '@/modules/doc/doc.service'
import { docTaskManager } from '@/modules/task/task.service'
import { createRouter } from '@/shared/create-app'
import { getRepoDeps } from '@/shared/deps'
import { Res200, Res201, Res400, Res401, Res404, Res409 } from '@/shared/utils/response-template'

import { getCurrentUserId } from '@/shared/utils/user'
import { jsonValidator, queryValidator } from '@/shared/utils/validator'

const router = createRouter()
  .get(
    '/',
    queryValidator(DocListQuerySchema),
    async (c) => {
      const { page, pageSize, name, source, type, createdFrom, createdTo, updatedFrom, updatedTo } = c.req.valid('query')
      const userId = getCurrentUserId(c)

      try {
        const result = await listDocs(page, pageSize, type, userId || undefined, { q: name, source, createdFrom, createdTo, updatedFrom, updatedTo })
        return c.json(Res200(result) as ApiSuccess, 200)
      }
      catch (e: any) {
        return c.json(Res400(null, e?.message) as ApiError, 400)
      }
    },
  )
  .post('/add', jsonValidator(DocAddBodySchema), async (c) => {
    const { url, docName } = c.req.valid('json')

    const prepared = await prepareGitDoc(url, docName)
    if (prepared.exists) {
      return c.json(Res409({ slug: prepared.slug, docName: prepared.docName }, '文档已存在') as ApiError, 409)
    }

    const { taskRepo } = getRepoDeps()
    const taskRecord = await taskRepo.create({
      type: 'doc_index',
    })

    const task = docTaskManager.createTask({
      id: taskRecord.id,
      slug: prepared.slug,
      name: prepared.docName,
      url,
      source: 'git',
    })

    indexGitDoc(task)
      .then(() => {
        task.endWithCompleted()
        taskRepo.updateStatus(taskRecord.id, 'completed')
      })
      .catch((err) => {
        task.endWithFailed()
        taskRepo.updateStatus(taskRecord.id, 'failed', err.message)
      })

    return c.json(Res201({ taskId: task.id, dbTaskId: taskRecord.id, slug: prepared.slug, docName: prepared.docName }, 'success') as ApiSuccess, 201)
  })
  .get('/:slug', async (c) => {
    const { slug } = c.req.param()
    const doc = await getDocDetail(slug)
    if (!doc)
      return c.json(Res404(null, '文档不存在') as ApiError, 404)
    return c.json(Res200(doc) as ApiSuccess, 200)
  })
  .post('/:slug/favorite', jsonValidator(z.object({ like: z.boolean() })), async (c) => {
    const userId = getCurrentUserId(c)
    if (!userId)
      return c.json(Res401(null, '未登录') as ApiError, 401)
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
    '/:slug/llm.txt',
    queryValidator(z.object({
      topic: z.string().optional().default(''),
      tokens: PositiveIntOptionalSchema.default(10000),
    })),
    async (c) => {
      const { slug } = c.req.param()
      const { topic, tokens } = c.req.valid('query')
      const text = await generateLlmText(slug, topic, tokens)
      return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    },
  )
  .get(
    '/:slug/query',
    queryValidator(z.object({
      q: z.string().optional().default(''),
      tokens: PositiveIntOptionalSchema.default(10000),
    })),
    async (c) => {
      const { slug } = c.req.param()
      const { q, tokens } = c.req.valid('query')
      const result = await queryDocSnippets(slug, q, tokens)
      return c.json(Res200(result) as ApiSuccess, 200)
    },
  )

export default router
