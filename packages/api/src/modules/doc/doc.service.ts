import type { DocSourceEnumDTO, TaskDocDTO } from './doc.dto'
import type { DocEntity } from './doc.entity'
import type { DocVO } from './doc.vo'

import type { PaginationVO } from '@/shared/vo'
import { MetadataMode } from 'llamaindex'

import { generateFilters } from '@/modules/doc/infrastructure/agent/engine/query-filter'
import { getIndex } from '@/modules/doc/infrastructure/agent/storage'
import { getRepoDeps, getServiceDeps } from '@/shared/deps'
import { logger } from '@/shared/logger'
import { buildDocIdentifiersFromUrl } from '@/shared/utils/url'

function toDocVO(entity: DocEntity<Date>): DocVO {
  return {
    ...entity,
    createdAt: entity.createdAt.getTime(),
    updatedAt: entity.updatedAt.getTime(),
  }
}

export async function listFavoriteDocs(
  userId: number,
  page: number,
  pageSize: number,
): Promise<PaginationVO<DocVO>> {
  const { docRepo: repo } = getRepoDeps()
  const result = await repo.listFavoritesByUser(userId, page, pageSize)
  return {
    ...result,
    list: result.list.map(toDocVO),
  }
}

export async function listDocs(
  page: number,
  pageSize: number,
  filters?: { q?: string, source?: DocSourceEnumDTO, createdFrom?: number, createdTo?: number, updatedFrom?: number, updatedTo?: number },
  sort?: 'popularity' | undefined,
): Promise<PaginationVO<DocVO>> {
  const { docRepo: repo } = getRepoDeps()
  const result = await repo.list(page, pageSize, filters, sort)
  return {
    ...result,
    list: result.list.map(toDocVO),
  }
}

export async function listLatestDocs(limit: number): Promise<DocVO[]> {
  const { docRepo: repo } = getRepoDeps()
  const docs = await repo.listLatest(limit)
  return docs.map(toDocVO)
}

export async function getDocDetail(slug: string): Promise<DocVO | null> {
  const { docRepo } = getRepoDeps()
  const { rankService } = getServiceDeps()
  const doc = await docRepo.findBySlugWithCache(slug)
  if (doc) {
    rankService.incrementDocScore(slug, 1)
    return toDocVO(doc)
  }
  return null
}

export async function toggleFavorite(userId: number, slug: string, like: boolean) {
  const { docRepo } = getRepoDeps()
  const doc = await docRepo.findBySlug(slug)
  if (!doc)
    return false
  return docRepo.toggleFavorite(userId, doc.id, like)
}

export async function prepareDoc(url: string, source: DocSourceEnumDTO) {
  const identifiers = buildDocIdentifiersFromUrl(url, source)
  const { docRepo } = getRepoDeps()
  const targetDoc = await docRepo.findBySlug(identifiers.slug)
  return { slug: identifiers.slug, name: identifiers.docName, existing: !!targetDoc }
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
    const content = n.node.getContent(MetadataMode.NONE)
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

export async function queryDocSnippets(slug: string, topic: string, tokens: number) {
  const { rankService } = getServiceDeps()
  rankService.incrementDocScore(slug, 2)
  const nodes = await retrieveDocNodes(slug, topic, tokens)
  // console.log('========', nodes)
  return { snippets: nodes }
}
