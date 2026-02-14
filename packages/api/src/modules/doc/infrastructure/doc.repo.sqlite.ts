import { and, eq, gte, inArray, like, lte } from 'drizzle-orm'
import type { SqliteDB } from '@/shared/db/connection'
import type { PaginationVO } from '@/shared/vo'
import type { DocEntity } from '@/modules/doc/doc.entity'
import type { CreateDocDTO } from '@/modules/doc/doc.dto'
import type { IDocRepository } from '@/modules/doc/doc.repo.interface'
import { docSqlite, type DocSqlitePO, favoriteSqlite } from '@/modules/doc/infrastructure/doc.po'

function mapper(row: DocSqlitePO): DocEntity<Date> {
  return {
    id: row.id!,
    slug: row.slug!,
    name: row.name!,
    source: (row.source || 'git') as DocEntity<Date>['source'],
    url: row.url!,
    taskId: row.taskId ?? undefined,
    accessCount: row.accessCount || 0,
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
    filters?: { q?: string; source?: 'git' | 'website'; createdFrom?: number; createdTo?: number; updatedFrom?: number; updatedTo?: number },
    sort?: 'popularity' | 'createdAt' | 'updatedAt',
  ): Promise<PaginationVO<DocEntity<Date>>> {
    const offset = (page - 1) * pageSize

    const where = !filters
      ? undefined
      : (fields) => {
          const conditions = []
          if (filters.q) conditions.push(like(fields.name, `%${filters.q}%`))
          if (filters.source) conditions.push(eq(fields.source, filters.source))
          if (filters.createdFrom) conditions.push(gte(fields.createdAt, filters.createdFrom))
          if (filters.createdTo) conditions.push(lte(fields.createdAt, filters.createdTo))
          if (filters.updatedFrom) conditions.push(gte(fields.updatedAt, filters.updatedFrom))
          if (filters.updatedTo) conditions.push(lte(fields.updatedAt, filters.updatedTo))
          return conditions.length ? and(...conditions) : undefined
        }

    const orderBy = sort === 'popularity'
      ? (fields, { desc }) => [desc(fields.accessCount)]
      : sort === 'createdAt'
          ? (fields, { desc }) => [desc(fields.createdAt)]
          : (fields, { desc }) => [desc(fields.updatedAt)]

    const rows = await this.db.query.doc.findMany({ limit: pageSize, offset, where, orderBy })
    const totalRows = await this.db.query.doc.findMany({ where })

    const list = rows.map(mapper)
    const total = totalRows.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return { list, total, page, pageSize, totalPages }
  }

  async listFavoritesByUser(userId: number, page: number, pageSize: number): Promise<PaginationVO<DocEntity<Date>>> {
    const offset = (page - 1) * pageSize

    const favoriteRows = await this.db.query.favorite.findMany({
      limit: pageSize,
      offset,
      where: eq(favoriteSqlite.userId, userId),
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    })
    const ids = favoriteRows.map(f => f.docId).filter((id): id is number => typeof id === 'number')

    const rows = await this.db.query.doc.findMany({
      where: ids.length ? (fields) => inArray(fields.id, ids) : undefined,
    })
    const list = rows.map(mapper)

    const totalRows = await this.db.query.favorite.findMany({ where: eq(favoriteSqlite.userId, userId) })
    const total = totalRows.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
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

  async create(input: CreateDocDTO): Promise<DocEntity<Date>> {
    const [row] = await this.db.insert(docSqlite).values({
      slug: input.slug,
      name: input.name,
      source: input.source,
      url: input.url,
      taskId: input.taskId,
    }).returning()
    return mapper(row)
  }

  async incrementAccess(docIdValue: number): Promise<void> {
    const existing = await this.db.query.doc.findFirst({ where: eq(docSqlite.id, docIdValue) })
    const count = (existing?.accessCount || 0) + 1
    await this.db.update(docSqlite).set({ accessCount: count }).where(eq(docSqlite.id, docIdValue))
  }

  async toggleFavorite(userId: number, docIdValue: number, like: boolean): Promise<boolean> {
    const has = await this.db.query.favorite.findFirst({ where: and(eq(favoriteSqlite.userId, userId), eq(favoriteSqlite.docId, docIdValue)) })
    if (like) {
      if (has) return true
      await this.db.insert(favoriteSqlite).values({ userId, docId: docIdValue })
      return true
    }
    if (!has) return false
    await this.db.delete(favoriteSqlite).where(and(eq(favoriteSqlite.userId, userId), eq(favoriteSqlite.docId, docIdValue)))
    return false
  }

  async isFavorite(userId: number, docIdValue: number): Promise<boolean> {
    const has = await this.db.query.favorite.findFirst({ where: and(eq(favoriteSqlite.userId, userId), eq(favoriteSqlite.docId, docIdValue)) })
    return !!has
  }
}
