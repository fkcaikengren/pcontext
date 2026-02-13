import { getRepositories } from '@/repositories/repo.factory'
import type { DocRecord, IDocRepository } from '@/repositories/IDocRepository'
import { generateGitRepositoryData } from '@/infrastructure/agent/engine/generate'
import { getIndex } from '@/infrastructure/agent/storage'
import { generateFilters } from '@/infrastructure/agent/engine/query-filter'
import { initSettings } from '@/infrastructure/agent/settings'
import { logger } from '@/lib/logger'
import { Task } from '@/infrastructure/log-task'
import { DocTaskModel } from '@pcontext/shared/types'
import { buildDocIdentifiersFromUrl } from '@/utils/url'




export async function listDocs(
  page: number, 
  limit: number, 
  type: 'favorites' | 'trending' | undefined, 
  userId?: number, 
  filters?: { q?: string; source?: 'git' | 'website'; createdFrom?: number; createdTo?: number; updatedFrom?: number; updatedTo?: number }
) {
  const { docRepo: repo } = getRepositories()
  
  if (type === 'favorites') {
    if (!userId) throw new Error('UserId is required for favorites')
    return repo.listFavoritesByUser(userId, page, limit)
  }
  
  const sort = type === 'trending' ? 'popularity' : undefined
  return repo.list(page, limit, filters, sort)
}

export async function getDocDetail(slug: string) {
	const { docRepo } = getRepositories()
	return docRepo.findBySlug(slug)
}

export async function toggleFavorite(userId: number, slug: string, like: boolean) {
  const { docRepo } = getRepositories()
  const doc = await docRepo.findBySlug(slug)
  if (!doc) return false
  return docRepo.toggleFavorite(userId, doc.id, like)
}

export async function prepareGitDoc(url: string, docName?: string) {
	const identifiers = buildDocIdentifiersFromUrl(url, 'git')
  const finalName = (typeof docName === 'string' && docName.trim()) || identifiers.docName
  const { docRepo } = getRepositories()
  const existing = await docRepo.findBySlug(identifiers.slug)
  return { slug: identifiers.slug, docName: finalName, exists: !!existing }
}

export async function indexGitDoc(url: string, docName: string, slug: string, task: Task<DocTaskModel>) {
  let record: DocRecord | null = null
  try {
    const { docRepo } = getRepositories()
    await generateGitRepositoryData({ url, bizDocId: slug }, task)
    task.logInfo(`Indexed git repository ${slug} successfully`)
    record = await docRepo.create({ slug, name: docName, source: 'git', url })
    task.logInfo(`Add document ${slug} with slug ${record.slug} successfully`)
  } catch (err: any) {
    task.log('error', err.message) // 记录错误
    throw err
  }
  return record
}

export async function incrementDocAccess(slug: string) {
  const { docRepo: repo } = getRepositories()
  const record = await repo.findBySlug(slug)
  if (record) await repo.incrementAccess(record.id)
}

async function retrieveDocNodes(slug: string, topic: string, tokens: number) {
  
  const index = await getIndex()
  const retriever = index.asRetriever({ similarityTopK: 10, filters: generateFilters([slug]) })
  const nodes = await retriever.retrieve({ query: topic })
  
  const results = []
  let used = 0
  
  for (const n of nodes) {
    const content = n.node.getContent()
    if (used >= tokens) break
    results.push({
      filePath: n.node.metadata?.file_path || 'fragment',
      content,
      score: n.score
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
