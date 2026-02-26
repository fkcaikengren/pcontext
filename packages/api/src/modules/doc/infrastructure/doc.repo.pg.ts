import type { DocPgPO } from './doc.po'
import type { CreateDocDTO, DocSourceEnumDTO } from '@/modules/doc/doc.dto'
import type { DocEntity } from '@/modules/doc/doc.entity'
import type { IDocRepository } from '@/modules/doc/doc.repo.interface'
import type { PostgresqlDB } from '@/shared/db/connection'
import type { PaginationVO } from '@/shared/vo'
import { and, count, desc, eq, gte, inArray, like, lte } from 'drizzle-orm'
import { logger } from '@/shared/logger'
import { redis } from '@/shared/redis'
import { docPg, favoritePg } from './doc.po'

const DOC_CACHE_TTL_SECONDS = 60 * 60

function docCacheKey(slug: string) {
  return `docs:${slug}`
}

function mapper(row: DocPgPO): DocEntity<Date> {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    source: row.source as DocEntity<Date>['source'],
    url: row.url,
    taskId: row.taskId ?? undefined,
    accessCount: row.accessCount || 0,
    tokens: row.tokens || 0,
    snippets: row.snippets || 0,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export class PgDocRepository implements IDocRepository {
  private db: PostgresqlDB
  constructor(db: PostgresqlDB) { this.db = db }

  async list(
    page: number,
    pageSize: number,
    filters?: { q?: string, source?: DocSourceEnumDTO, createdFrom?: number, createdTo?: number, updatedFrom?: number, updatedTo?: number },
    sort?: 'popularity' | 'createdAt' | 'updatedAt',
  ): Promise<PaginationVO<DocEntity<Date>>> {
    const offset = (page - 1) * pageSize

    const where = (fields: any) => {
      const conditions = []
      if (filters?.q) {
        const keywords = filters.q.trim().split(/\s+/).filter(Boolean)
        if (keywords.length > 0) {
          conditions.push(and(...keywords.map(keyword => like(fields.name, `%${keyword}%`))))
        }
      }
      if (filters?.source)
        conditions.push(eq(fields.source, filters.source))
      if (filters?.createdFrom)
        conditions.push(gte(fields.createdAt, filters.createdFrom))
      if (filters?.createdTo)
        conditions.push(lte(fields.createdAt, filters.createdTo))
      if (filters?.updatedFrom)
        conditions.push(gte(fields.updatedAt, filters.updatedFrom))
      if (filters?.updatedTo)
        conditions.push(lte(fields.updatedAt, filters.updatedTo))
      return conditions.length ? and(...conditions) : undefined
    }

    const orderBy = (fields: any, { desc }: any) => {
      if (sort === 'popularity')
        return [desc(fields.accessCount)]
      if (sort === 'createdAt')
        return [desc(fields.createdAt)]
      return [desc(fields.updatedAt)]
    }

    const [rows, [totalResult]] = await Promise.all([
      this.db.query.doc.findMany({ limit: pageSize, offset, where, orderBy }),
      this.db.select({ value: count() }).from(docPg).where(where(docPg)),
    ])

    const list = rows.map(mapper)
    const total = Number(totalResult?.value ?? 0)
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return { list, total, page, pageSize, totalPages }
  }

  async listLatest(limit: number): Promise<DocEntity<Date>[]> {
    const rows = await this.db.query.doc.findMany({
      limit,
      orderBy: (fields, { desc }) => [desc(fields.updatedAt)],
    })
    return rows.map(mapper)
  }

  async search(q: string, limit: number): Promise<DocEntity<Date>[]> {
    const keywords = q.trim().split(/\s+/).filter(Boolean)
    const where = keywords.length > 0
      ? and(...keywords.map(keyword => like(docPg.name, `%${keyword}%`)))
      : undefined

    const rows = await this.db.query.doc.findMany({
      where,
      limit,
      orderBy: (fields, { desc }) => [desc(fields.updatedAt)],
    })
    return rows.map(mapper)
  }

  async listFavoritesByUser(userId: number, page: number, pageSize: number): Promise<PaginationVO<DocEntity<Date>>> {
    const offset = (page - 1) * pageSize

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(favoritePg)
      .where(eq(favoritePg.userId, userId))

    const total = Number(totalResult?.value ?? 0)
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    if (total === 0) {
      return { list: [], total, page, pageSize, totalPages }
    }

    const rows = await this.db
      .select({
        doc: docPg,
      })
      .from(favoritePg)
      .innerJoin(docPg, eq(favoritePg.docId, docPg.id))
      .where(eq(favoritePg.userId, userId))
      .orderBy(desc(favoritePg.createdAt))
      .limit(pageSize)
      .offset(offset)

    const list = rows.map(r => mapper(r.doc))
    return { list, total, page, pageSize, totalPages }
  }

  async findById(id: number): Promise<DocEntity<Date> | null> {
    const row = await this.db.query.doc.findFirst({ where: eq(docPg.id, id) })
    return row ? mapper(row) : null
  }

  async findBySlug(slug: string): Promise<DocEntity<Date> | null> {
    const row = await this.db.query.doc.findFirst({ where: eq(docPg.slug, slug) })
    return row ? mapper(row) : null
  }

  async findBySlugWithCache(slug: string): Promise<DocEntity<Date> | null> {
    const key = docCacheKey(slug)
    try {
      const cached = await redis.get(key)
      if (cached) {
        const parsed = JSON.parse(cached) as Omit<DocEntity<number>, 'createdAt' | 'updatedAt'> & { createdAt: number, updatedAt: number }
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
        }
      }
    }
    catch (error: any) {
      logger.error(`Redis GET failed: ${error?.message || 'unknown error'}`)
    }

    const doc = await this.findBySlug(slug)
    if (!doc)
      return null

    try {
      await redis.set(
        key,
        JSON.stringify({
          ...doc,
          createdAt: doc.createdAt.getTime(),
          updatedAt: doc.updatedAt.getTime(),
        }),
        'EX',
        DOC_CACHE_TTL_SECONDS,
      )
    }
    catch (error: any) {
      logger.error(`Redis SET failed: ${error?.message || 'unknown error'}`)
    }

    return doc
  }

  async invalidateCache(slug: string): Promise<void> {
    if (!slug)
      return
    try {
      await redis.del(docCacheKey(slug))
    }
    catch (error: any) {
      logger.error(`Redis DEL failed: ${error?.message || 'unknown error'}`)
    }
  }

  async create(input: CreateDocDTO): Promise<DocEntity<Date>> {
    const [row] = await this.db.insert(docPg).values({
      slug: input.slug,
      name: input.name,
      source: input.source,
      url: input.url,
      taskId: input.taskId,
      tokens: input.tokens,
      snippets: input.snippets,
    }).returning()
    return mapper(row)
  }

  async incrementAccess(docIdValue: number): Promise<void> {
    const existing = await this.db.query.doc.findFirst({ where: eq(docPg.id, docIdValue) })
    const count = (existing?.accessCount || 0) + 1
    await this.db.update(docPg).set({ accessCount: count }).where(eq(docPg.id, docIdValue))
    const slug = existing?.slug
    if (slug)
      await this.invalidateCache(slug)
  }

  async toggleFavorite(userId: number, docIdValue: number, like: boolean): Promise<boolean> {
    const has = await this.db.query.favorite.findFirst({ where: and(eq(favoritePg.userId, userId), eq(favoritePg.docId, docIdValue)) })
    if (like) {
      if (has)
        return true
      await this.db.insert(favoritePg).values({ userId, docId: docIdValue })
      return true
    }
    if (!has)
      return false
    await this.db.delete(favoritePg).where(and(eq(favoritePg.userId, userId), eq(favoritePg.docId, docIdValue)))
    return false
  }

  async isFavorite(userId: number, docIdValue: number): Promise<boolean> {
    const has = await this.db.query.favorite.findFirst({ where: and(eq(favoritePg.userId, userId), eq(favoritePg.docId, docIdValue)) })
    return !!has
  }
}
