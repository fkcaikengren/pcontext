import { z } from 'zod'
import { jsonValidator, queryValidator } from '@/utils/validator'
import { createRouter } from '@/lib/create-app'
import { listDocs, getDocDetail, indexGitDoc, toggleFavorite, incrementDocAccess, generateLlmText, queryDocSnippets, prepareGitDoc } from '@/services/doc.service'
import { getCurrentUserId } from '@/utils/user'
import { docTaskManager } from '@/services/task.service'

const gitSshUrlRegex = /^git@.+(\.git)?$/

const urlSchema = z.string().refine((value) => {
  try {
    new URL(value)
    return true
  } catch {
    return gitSshUrlRegex.test(value)
  }
}, { message: 'Invalid url' })


const positiveNumSchema = z.coerce.number().int().positive().optional()


const router = createRouter()
  .get(
    '/',
    queryValidator(z.object({
      page: positiveNumSchema.default(1),
      limit: positiveNumSchema.default(10),
      name: z.string().optional(),
      source: z.enum(['git', 'website']).optional(),
      type: z.enum(['favorites', 'trending']).optional(),
      createdFrom: positiveNumSchema,
      createdTo: positiveNumSchema,
      updatedFrom: positiveNumSchema,
      updatedTo: positiveNumSchema,
    })),
    async (c) => {
      const { page, limit, name, source, type, createdFrom, createdTo, updatedFrom, updatedTo } = c.req.valid('query')
      const userId = getCurrentUserId(c)

      try {
        const result = await listDocs(page, limit, type, userId || undefined, { q: name, source, createdFrom, createdTo, updatedFrom, updatedTo })
        return c.json(result)
      } catch (e: any) {
        return c.json({ message: e.message, }, 400)
      }
    },
  )
  .post('/add', 
    jsonValidator(z.object({ url: urlSchema, docName: z.string().optional() })),
    async (c) => {
      const { url, docName } = c.req.valid('json')

      const prepared = await prepareGitDoc(url, docName)
      if (prepared.exists) {
        return c.json({
          code: 409, 
          errMsg: '文档已存在', 
          data: {
            slug: prepared.slug,
            docName: prepared.docName,
          }}, 409)
      }

      const task = docTaskManager.createTask({ url, source: 'git', name: prepared.docName });

      indexGitDoc(url, prepared.docName, prepared.slug, task)
        .then(() => {
          task.endWithCompleted()
        })
        .catch(() => {
          task.endWithFailed()
        })

      return c.json({ message: 'success', taskId: task.id }, 201)
    })
  .get('/:slug', async (c) => {
    const { slug } = c.req.param()
    const doc = await getDocDetail(slug)
    if (!doc) return c.json({ message: '文档不存在' }, 404)
    return c.json(doc)
  })
  .post('/:slug/favorite',
    jsonValidator(z.object({ like: z.boolean() })),  
    async (c) => {
      const userId = getCurrentUserId(c)
      if (!userId) return c.json({ message: '未登录' }, 401)
      const { slug } = c.req.param()
      const { like } = c.req.valid('json')
      const ok = await toggleFavorite(userId as number, slug, like)
      return c.json({ favorite: ok })
    })
  .post('/:slug/check', async (c) => {
    const { slug } = c.req.param()
    await incrementDocAccess(slug)
    return c.json({ ok: true })
  })
  .get(
    '/:slug/llm.txt',
    queryValidator(z.object({
      topic: z.string().optional().default(''),
      tokens: positiveNumSchema.default(10000),
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
      tokens: positiveNumSchema.optional().default(10000),
    })),
    async (c) => {
      const { slug } = c.req.param()
      const { q, tokens } = c.req.valid('query')
      const result = await queryDocSnippets(slug, q, tokens)
      return c.json(result)
    },
  )

export default router
