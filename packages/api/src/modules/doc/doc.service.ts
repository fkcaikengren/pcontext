import type { DocSourceEnumDTO } from './doc.dto'
import type { DocEntity } from './doc.entity'
import type { DocVO } from './doc.vo'

import type { PaginationVO } from '@/shared/vo'
import { MetadataMode } from 'llamaindex'

import { generateFilters } from '@/modules/doc/infrastructure/agent/engine/query-filter'
import { getIndex } from '@/modules/doc/infrastructure/agent/storage'
import { getRepoDeps, getServiceDeps } from '@/shared/deps'
import { logger } from '@/shared/logger'
import { Cache, CacheableService, Invalidate } from '@/shared/redis/decorator'
import { buildDocIdentifiersFromUrl } from '@/shared/utils/url'

function toDocVO(entity: DocEntity<Date>): DocVO {
  return {
    ...entity,
    createdAt: entity.createdAt.getTime(),
    updatedAt: entity.updatedAt.getTime(),
  }
}

@CacheableService('doc')
export class DocService {
  private get docRepo() {
    return getRepoDeps().docRepo
  }

  private get rankService() {
    return getServiceDeps().rankService
  }

  async listFavoriteDocs(
    userId: number,
    page: number,
    pageSize: number,
  ): Promise<PaginationVO<DocVO>> {
    const result = await this.docRepo.listFavoritesByUser(userId, page, pageSize)
    return {
      ...result,
      list: result.list.map(doc => ({
        ...toDocVO(doc),
        starred: true,
      })),
    }
  }

  async listDocs(
    page: number,
    pageSize: number,
    filters?: { q?: string, source?: DocSourceEnumDTO, createdFrom?: number, createdTo?: number, updatedFrom?: number, updatedTo?: number },
    sort?: 'popularity' | undefined,
  ): Promise<PaginationVO<DocVO>> {
    const result = await this.docRepo.list(page, pageSize, filters, sort)
    return {
      ...result,
      list: result.list.map(toDocVO),
    }
  }

  async listLatestDocs(limit: number, userId?: number): Promise<DocVO[]> {
    const docs = await this.docRepo.listLatest(limit)

    if (!userId) {
      return docs.map(toDocVO)
    }

    const docIds = docs.map(d => d.id)
    const favoritePromises = docIds.map(docId => this.docRepo.isFavorite(userId, docId))
    const favoriteResults = await Promise.all(favoritePromises)

    return docs.map((doc, index) => ({
      ...toDocVO(doc),
      starred: favoriteResults[index],
    }))
  }

  async searchDocs(q: string, limit: number, userId?: number): Promise<DocVO[]> {
    const docs = await this.docRepo.search(q, limit)

    if (!userId) {
      return docs.map(toDocVO)
    }

    const docIds = docs.map(d => d.id)
    const favoritePromises = docIds.map(docId => this.docRepo.isFavorite(userId, docId))
    const favoriteResults = await Promise.all(favoritePromises)

    return docs.map((doc, index) => ({
      ...toDocVO(doc),
      starred: favoriteResults[index],
    }))
  }

  @Cache({ key: (slug: string) => `detail:${slug}`, tags: (slug: string) => [`doc:${slug}`], ttl: 3600 })
  async getDocDetail(slug: string): Promise<DocVO | null> {
    const doc = await this.docRepo.findBySlug(slug)
    if (doc) {
      this.rankService.incrementDocScore(slug, 1)
      return toDocVO(doc)
    }
    return null
  }

  @Invalidate({ namespace: 'rank', tags: (userId: string) => [`favorites:${userId}`] })
  async toggleFavorite(userId: number, slug: string, like: boolean) {
    const doc = await this.docRepo.findBySlug(slug)
    if (!doc)
      return false
    return this.docRepo.toggleFavorite(userId, doc.id, like)
  }

  async prepareDoc(url: string, source: DocSourceEnumDTO) {
    const identifiers = buildDocIdentifiersFromUrl(url, source)
    const targetDoc = await this.docRepo.findBySlug(identifiers.slug)
    return { slug: identifiers.slug, name: identifiers.docName, existing: !!targetDoc }
  }

  async queryDocSnippets(slug: string, topic: string, tokens: number) {
    this.rankService.incrementDocScore(slug, 2)
    const nodes = await this.retrieveDocNodes(slug, topic, tokens)
    // console.log('========', nodes)
    return { snippets: nodes }
  }

  private async retrieveDocNodes(slug: string, topic: string, tokens: number) {
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
}
