import type { IDocRepository, CreateDocInput, DocRecord } from '../IDocRepository'
import type { Pagination } from '@/domain/user.entity.ts'
import { and, desc, eq, like, gte, lte } from 'drizzle-orm'
import type { SqliteDB } from '@/infrastructure/db/connection'
import { doc, favorite } from '@/infrastructure/db/schemas/doc.sqlite'

function toDomain(row: typeof doc.$inferSelect): DocRecord {
  return {
    id: row.id!,
    slug: row.slug!,
    name: row.name!,
    source: row.source as DocRecord['source'],
    url: row.url!,
    accessCount: row.accessCount || 0,
    createdAt: new Date(row.createdAt as number),
    updatedAt: new Date(row.updatedAt as number),
  }
}

export class SqliteDocRepository implements IDocRepository {
  private db: SqliteDB
  constructor(db: SqliteDB) { this.db = db }

  async list(page: number, limit: number, filters?: { q?: string; source?: 'git' | 'website'; createdFrom?: number; createdTo?: number; updatedFrom?: number; updatedTo?: number }, sort?: 'popularity' | 'createdAt' | 'updatedAt'): Promise<Pagination<DocRecord>> {
    const offset = (page - 1) * limit
    const whereParts: any[] = []
    if (filters?.q) whereParts.push(like(doc.name, `%${filters.q}%`))
    if (filters?.source) whereParts.push(eq(doc.source, filters.source))
    if (filters?.createdFrom) whereParts.push(gte(doc.createdAt, filters.createdFrom))
    if (filters?.createdTo) whereParts.push(lte(doc.createdAt, filters.createdTo))
    if (filters?.updatedFrom) whereParts.push(gte(doc.updatedAt, filters.updatedFrom))
    if (filters?.updatedTo) whereParts.push(lte(doc.updatedAt, filters.updatedTo))
    const where = whereParts.length ? and(...whereParts as any) : undefined
    const orderBy = sort === 'popularity' ? (fields: any, { desc }: any) => [desc(fields.accessCount)] : sort === 'createdAt' ? (fields: any, { desc }: any) => [desc(fields.createdAt)] : (fields: any, { desc }: any) => [desc(fields.updatedAt)]
    const rows = await this.db.query.doc.findMany({ limit, offset, where, orderBy })
    const totalRows = await this.db.query.doc.findMany({ where })
    const content = rows.map(toDomain)
    const total = totalRows.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    return { list: content, total, page, limit, totalPages }
  }

  async listFavoritesByUser(userId: number, page: number, limit: number): Promise<Pagination<DocRecord>> {
    const offset = (page - 1) * limit
    const favs = await this.db.select().from(favorite).where(eq(favorite.userId, userId)).limit(limit).offset(offset)
    const ids = favs.map((f: any) => f.docId)
    const rows = ids.length ? await this.db.select().from(doc).where((fields: any, { inArray }: any) => inArray(doc.id, ids)) : []
    const content = rows.map(toDomain as any)
    const totalRows = await this.db.select().from(favorite).where(eq(favorite.userId, userId))
    const total = totalRows.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    return { list: content, total, page, limit, totalPages }
  }

  async findById(id: number): Promise<DocRecord | null> {
    const row = await this.db.query.doc.findFirst({ where: eq(doc.id, id) })
    return row ? toDomain(row) : null
  }

  async findBySlug(slug: string): Promise<DocRecord | null> {
    const row = await this.db.query.doc.findFirst({ where: eq(doc.slug, slug) })
    return row ? toDomain(row) : null
  }

  async create(input: CreateDocInput): Promise<DocRecord> {
    const [row] = await this.db.insert(doc).values({
      slug: input.slug,
      name: input.name,
      source: input.source,
      url: input.url,
    }).returning()
    return toDomain(row)
  }

  async incrementAccess(docIdValue: number): Promise<void> {
    const existing = await this.db.query.doc.findFirst({ where: eq(doc.id, docIdValue) })
    const count = (existing?.accessCount || 0) + 1
    await this.db.update(doc).set({ accessCount: count }).where(eq(doc.id, docIdValue))
  }

  async toggleFavorite(userId: number, docIdValue: number, like: boolean): Promise<boolean> {
    const has = await this.db.query.favorite.findFirst({ where: and(eq(favorite.userId, userId), eq(favorite.docId, docIdValue)) })
    if (like) {
      if (has) return true
      await this.db.insert(favorite).values({ userId, docId: docIdValue })
      return true
    }
    if (!has) return false
    await this.db.delete(favorite).where(and(eq(favorite.userId, userId), eq(favorite.docId, docIdValue)))
    return false
  }

  async isFavorite(userId: number, docIdValue: number): Promise<boolean> {
    const has = await this.db.query.favorite.findFirst({ where: and(eq(favorite.userId, userId), eq(favorite.docId, docIdValue)) })
    return !!has
  }
}
