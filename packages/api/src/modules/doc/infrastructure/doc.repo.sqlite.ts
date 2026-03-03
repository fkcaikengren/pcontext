import type { CreateDocDTO, DocSourceEnumDTO } from '@/modules/doc/doc.dto'
import type { DocEntity } from '@/modules/doc/doc.entity'
import type { IDocRepository } from '@/modules/doc/doc.repo.interface'
import type { DocSqlitePO } from '@/modules/doc/infrastructure/doc.po'
import type { SqliteDB } from '@/shared/db/connection'
import type { PaginationVO } from '@/shared/vo'
import { and, count, desc, eq, gte, like, lte } from 'drizzle-orm'
import { docSqlite, favoriteSqlite } from '@/modules/doc/infrastructure/doc.po'
import { logger } from '@/shared/logger'
import { redis } from '@/shared/redis'

function docCacheKey(slug: string) {
  return `docs:${slug}`
}

function mapper(row: DocSqlitePO): DocEntity<Date> {
  return {
    id: row.id!,
    slug: row.slug!,
    name: row.name!,
    source: (row.source || 'git') as DocEntity<Date>['source'],
    url: row.url!,
    taskId: row.taskId ?? undefined,
    accessCount: row.accessCount || 0,
    tokens: row.tokens || 0,
    snippets: row.snippets || 0,
    createdAt: new Date(row.createdAt as number),
    updatedAt: new Date(row.updatedAt as number),
  }
}

export class SqliteDocRepository implements IDocRepository {
  private db: SqliteDB
  constructor(db: SqliteDB) { this.db = db }

  async list(
    page: number,
    pageSize: number,
    filters?: { q?: string, source?: DocSourceEnumDTO, createdFrom?: number, createdTo?: number, updatedFrom?: number, updatedTo?: number },
    sort?: 'popularity' | 'createdAt' | 'updatedAt',
  ): Promise<PaginationVO<DocEntity<Date>>> {
    const offset = (page - 1) * pageSize

    const where = !filters
      ? undefined
      : (fields: any) => {
          const conditions = []
          if (filters.q) {
            const keywords = filters.q.trim().split(/\s+/).filter(Boolean)
            if (keywords.length > 0) {
              conditions.push(and(...keywords.map(keyword => like(fields.name, `%${keyword}%`))))
            }
          }
          if (filters.source)
            conditions.push(eq(fields.source, filters.source))
          if (filters.createdFrom)
            conditions.push(gte(fields.createdAt, filters.createdFrom))
          if (filters.createdTo)
            conditions.push(lte(fields.createdAt, filters.createdTo))
          if (filters.updatedFrom)
            conditions.push(gte(fields.updatedAt, filters.updatedFrom))
          if (filters.updatedTo)
            conditions.push(lte(fields.updatedAt, filters.updatedTo))
          return conditions.length ? and(...conditions) : undefined
        }

    const orderBy = sort === 'popularity'
      ? (fields: any, { desc }: any) => [desc(fields.accessCount)]
      : sort === 'createdAt'
        ? (fields: any, { desc }: any) => [desc(fields.createdAt)]
        : (fields: any, { desc }: any) => [desc(fields.updatedAt)]

    const [rows, [totalResult]] = await Promise.all([
      this.db.query.doc.findMany({ limit: pageSize, offset, where, orderBy }),
      this.db
        .select({ value: count() })
        .from(docSqlite)
        .where(where ? where(docSqlite) : undefined),
    ])

    const list = rows.map(mapper)
    const total = totalResult?.value ?? 0
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
      ? and(...keywords.map(keyword => like(docSqlite.name, `%${keyword}%`)))
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
      .from(favoriteSqlite)
      .where(eq(favoriteSqlite.userId, userId))

    const total = totalResult?.value ?? 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    if (total === 0) {
      return { list: [], total: 0, page, pageSize, totalPages }
    }

    const rows = await this.db
      .select({
        doc: docSqlite,
      })
      .from(favoriteSqlite)
      .innerJoin(docSqlite, eq(favoriteSqlite.docId, docSqlite.id))
      .where(eq(favoriteSqlite.userId, userId))
      .orderBy(desc(favoriteSqlite.createdAt))
      .limit(pageSize)
      .offset(offset)

    const list = rows.map(r => mapper(r.doc))
    return { list, total, page, pageSize, totalPages }
  }

  async findById(id: number): Promise<DocEntity<Date> | null> {
    const row = await this.db.query.doc.findFirst({ where: eq(docSqlite.id, id) })
    return row ? mapper(row) : null
  }

  async findBySlug(slug: string): Promise<DocEntity<Date> | null> {
    const row = await this.db.query.doc.findFirst({ where: eq(docSqlite.slug, slug) })
    return row ? mapper(row) : null
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
    const [row] = await this.db.insert(docSqlite).values({
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
    const existing = await this.db.query.doc.findFirst({ where: eq(docSqlite.id, docIdValue) })
    const count = (existing?.accessCount || 0) + 1
    await this.db.update(docSqlite).set({ accessCount: count }).where(eq(docSqlite.id, docIdValue))
    const slug = existing?.slug
    if (slug)
      await this.invalidateCache(slug)
  }

  async toggleFavorite(userId: number, docIdValue: number, like: boolean): Promise<boolean> {
    const has = await this.db.query.favorite.findFirst({ where: and(eq(favoriteSqlite.userId, userId), eq(favoriteSqlite.docId, docIdValue)) })
    if (like) {
      if (has)
        return true
      await this.db.insert(favoriteSqlite).values({ userId, docId: docIdValue })
      return true
    }
    if (!has)
      return false
    await this.db.delete(favoriteSqlite).where(and(eq(favoriteSqlite.userId, userId), eq(favoriteSqlite.docId, docIdValue)))
    return false
  }

  async isFavorite(userId: number, docIdValue: number): Promise<boolean> {
    const has = await this.db.query.favorite.findFirst({ where: and(eq(favoriteSqlite.userId, userId), eq(favoriteSqlite.docId, docIdValue)) })
    return !!has
  }
}
