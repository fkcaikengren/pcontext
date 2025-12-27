import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createRouter } from '@/lib/create-app'
import { validatePaginationQuery } from '@/utils/pagination'
import { listDocs, getDocDetail, indexGitDoc, toggleFavorite, incrementDocAccess, generateLlmText, queryDocSnippets, prepareGitDoc } from '@/services/doc.service'
import { getCurrentUserId } from '@/utils/user'
import { docTaskManager } from '@/services/task.service'

const router = createRouter()

const gitSshUrlRegex = /^git@.+(\.git)?$/

const urlSchema = z.string().refine((value) => {
  try {
    new URL(value)
    return true
  } catch {
    return gitSshUrlRegex.test(value)
  }
}, { message: 'Invalid url' })

router.get('/', async (c) => {
  const q = c.req.query()
  const { page, limit, name } = validatePaginationQuery(q)
  const source = (Array.isArray(q.source) ? q.source[0] : q.source) as 'git' | 'website' | undefined
  const type = (Array.isArray(q.type) ? q.type[0] : q.type) as 'favorites' | 'trending' | undefined
  
  const createdFrom = q.createdFrom ? Number(Array.isArray(q.createdFrom) ? q.createdFrom[0] : q.createdFrom) : undefined
  const createdTo = q.createdTo ? Number(Array.isArray(q.createdTo) ? q.createdTo[0] : q.createdTo) : undefined
  const updatedFrom = q.updatedFrom ? Number(Array.isArray(q.updatedFrom) ? q.updatedFrom[0] : q.updatedFrom) : undefined
  const updatedTo = q.updatedTo ? Number(Array.isArray(q.updatedTo) ? q.updatedTo[0] : q.updatedTo) : undefined
  
  const userId = getCurrentUserId(c)
  
  try {
    const result = await listDocs(page, limit, type, userId || undefined, { q: name, source, createdFrom, createdTo, updatedFrom, updatedTo })
    return c.json(result)
  } catch (e: any) {
    return c.json({ message: e.message }, 400)
  }
})

router.post('/add', zValidator('json', z.object({ url: urlSchema })), async (c) => {
  const { url, docName } = await c.req.json()

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

router.get('/:slug', async (c) => {
	const { slug } = c.req.param()
	const doc = await getDocDetail(slug)
	if (!doc) return c.json({ message: '文档不存在' }, 404)
	return c.json(doc)
})

router.post('/:slug/favorite', zValidator('json', z.object({ like: z.boolean() })), async (c) => {
  const userId = getCurrentUserId(c)
  if (!userId) return c.json({ message: '未登录' }, 401)
  const { slug } = c.req.param()
  const { like } = await c.req.json()
  const ok = await toggleFavorite(userId as number, slug, like)
  return c.json({ favorite: ok })
})

router.post('/:slug/check', async (c) => {
  const { slug } = c.req.param()
  await incrementDocAccess(slug)
  return c.json({ ok: true })
})

router.get('/:slug/llm.txt', async (c) => {
  const { slug } = c.req.param()
  const url = new URL(c.req.url)
  const topic = url.searchParams.get('topic') || ''
  const tokens = Number(url.searchParams.get('tokens') || '10000')
  const text = await generateLlmText(slug, topic, tokens)
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
})

router.get('/:slug/query', async (c) => {
  const { slug } = c.req.param()
  const url = new URL(c.req.url)
  const topic = url.searchParams.get('topic') || ''
  const tokens = Number(url.searchParams.get('tokens') || '10000')
  const result = await queryDocSnippets(slug, topic, tokens)
  return c.json(result)
})

export default router
