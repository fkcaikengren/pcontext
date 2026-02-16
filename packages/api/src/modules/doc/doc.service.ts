import type { TaskDocDTO } from './doc.dto'
import type { DocEntity } from './doc.entity'
import type { Task } from '@/modules/task/infrastructure/log-task'
import { generateGitRepositoryData } from '@/modules/doc/infrastructure/agent/engine/generate'
import { generateFilters } from '@/modules/doc/infrastructure/agent/engine/query-filter'
import { getIndex } from '@/modules/doc/infrastructure/agent/storage'
import { getRepoDeps } from '@/shared/deps'
import { logger } from '@/shared/logger'
import { buildDocIdentifiersFromUrl } from '@/shared/utils/url'

export async function listDocs(
  page: number,
  pageSize: number,
  type: 'favorites' | 'trending' | undefined,
  userId?: number,
  filters?: { q?: string, source?: 'git' | 'website', createdFrom?: number, createdTo?: number, updatedFrom?: number, updatedTo?: number },
) {
  const { docRepo: repo } = getRepoDeps()

  if (type === 'favorites') {
    if (!userId)
      throw new Error('UserId is required for favorites')
    return repo.listFavoritesByUser(userId, page, pageSize)
  }

  const sort = type === 'trending' ? 'popularity' : undefined
  return repo.list(page, pageSize, filters, sort)
}

export async function getDocDetail(slug: string) {
  const { docRepo } = getRepoDeps()
  return docRepo.findBySlug(slug)
}

export async function toggleFavorite(userId: number, slug: string, like: boolean) {
  const { docRepo } = getRepoDeps()
  const doc = await docRepo.findBySlug(slug)
  if (!doc)
    return false
  return docRepo.toggleFavorite(userId, doc.id, like)
}

export async function prepareGitDoc(url: string, docName?: string) {
  const identifiers = buildDocIdentifiersFromUrl(url, 'git')
  const finalName = (typeof docName === 'string' && docName.trim()) || identifiers.docName
  const { docRepo } = getRepoDeps()
  const existing = await docRepo.findBySlug(identifiers.slug)
  return { slug: identifiers.slug, docName: finalName, exists: !!existing }
}

export async function indexGitDoc(task: Task<TaskDocDTO>) {
  let record: DocEntity<Date> | null = null
  if (!task.extraData || !task.extraData.id) {
    throw new Error('task 必须包含 extraData')
  }
  const { slug, id: taskId, name: docName, url } = task.extraData || {}
  try {
    const { docRepo } = getRepoDeps()
    await generateGitRepositoryData({ url, bizDocId: slug }, task)
    task.logInfo(`Indexed git repository ${slug} successfully`)
    record = await docRepo.create({ slug, name: docName, source: 'git', url, taskId })
    task.logInfo(`Add document ${slug} with slug ${record.slug} successfully`)
  }
  catch (err: any) {
    task.log('error', err.message)
    throw err
  }
  return record
}

export async function incrementDocAccess(slug: string) {
  const { docRepo: repo } = getRepoDeps()
  const record = await repo.findBySlug(slug)
  if (record)
    await repo.incrementAccess(record.id)
}

async function retrieveDocNodes(slug: string, topic: string, tokens: number) {
  const index = await getIndex()
  const retriever = index.asRetriever({ similarityTopK: 10, filters: generateFilters([slug]) })
  const nodes = await retriever.retrieve({ query: topic })

  const results = []
  let used = 0

  for (const n of nodes) {
    const content = n.node.getContent()
    if (used >= tokens)
      break
    results.push({
      filePath: n.node.metadata?.file_path || 'fragment',
      content,
      score: n.score,
    })
    used += content.length
  }
  return results
}

export async function generateLlmText(slug: string, topic: string, tokens: number) {
  const nodes = await retrieveDocNodes(slug, topic, tokens)
  return nodes.map(n => `### ${n.filePath}\n${n.content}`).join('\n--------------------------------\n')
}

export async function queryDocSnippets(slug: string, topic: string, tokens: number) {
  const nodes = await retrieveDocNodes(slug, topic, tokens)
  return { snippets: nodes }
}
