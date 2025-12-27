import type { AuthUserRecord, IUserRepository } from '../IUserRepository'
import type { CreateUserInput, Pagination, UpdateSelfInput, UpdateUserInput, User } from '../../domain/user.entity.ts'
import { eq } from 'drizzle-orm'
import type { SqliteDB } from '../../infrastructure/db/connection'
import { user } from '../../infrastructure/db/schemas/user.sqlite'

function toDomain(row: typeof user.$inferSelect): User {
  return {
    id: row.id!,
    username: row.username!,
    name: row.name!,
    phone: row.phone!,
    email: row.email!,
    role: (row.role || 'user') as User['role'],
    status: (row.status || 'active') as User['status'],
    createdAt: new Date(row.createdAt as number),
    updatedAt: new Date(row.updatedAt as number),
  }
}

export class SqliteUserRepository implements IUserRepository {
  private db: SqliteDB

  constructor(db: SqliteDB) {
    this.db = db
  }

  async findById(id: number): Promise<User | null> {
    const row = await this.db.query.user.findFirst({ where: eq(user.id, id) })
    return row ? toDomain(row) : null
  }

  async findByUsername(usernameValue: string): Promise<User | null> {
    const row = await this.db.query.user.findFirst({ where: eq(user.username, usernameValue) })
    return row ? toDomain(row) : null
  }

  async findByPhone(phoneValue: string): Promise<User | null> {
    const row = await this.db.query.user.findFirst({ where: eq(user.phone, phoneValue) })
    return row ? toDomain(row) : null
  }

  async findByEmail(emailValue: string): Promise<User | null> {
    const row = await this.db.query.user.findFirst({ where: eq(user.email, emailValue) })
    return row ? toDomain(row) : null
  }

  async list(page: number, limit: number, filters?: { name?: string }): Promise<Pagination<User>> {
    const offset = (page - 1) * limit
    const rows = await this.db.query.user.findMany({
      limit,
      offset,
      where: filters?.name ? (fields, { like }) => like(fields.name, `%${filters.name}%`) : undefined,
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    })
    const totalRows = await this.db.query.user.findMany({
      where: filters?.name ? (fields, { like }) => like(fields.name, `%${filters.name}%`) : undefined,
    })
    const content = rows.map(toDomain)
    const total = totalRows.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    return { content, total, page, limit, totalPages }
  }

  async create(input: CreateUserInput): Promise<User> {
    const [row] = await this.db.insert(user).values({
      username: input.username,
      password: input.password,
      name: input.name,
      phone: input.phone,
      email: input.email,
      role: input.role ?? 'user',
      status: input.status ?? 'active',
    }).returning()
    return toDomain(row)
  }

  async updateById(id: number, input: UpdateUserInput): Promise<User | null> {
    const [row] = await this.db.update(user).set({
      username: input.username,
      password: input.password,
      name: input.name,
      phone: input.phone,
      email: input.email,
      role: input.role,
      status: input.status,
    }).where(eq(user.id, id)).returning()
    return row ? toDomain(row) : null
  }

  async updateSelf(id: number, input: UpdateSelfInput): Promise<User | null> {
    const [row] = await this.db.update(user).set({
      name: input.name,
      password: input.password,
      phone: input.phone,
      email: input.email,
    }).where(eq(user.id, id)).returning()
    return row ? toDomain(row) : null
  }

  async findAuthByUsername(usernameValue: string): Promise<AuthUserRecord | null> {
    const row = await this.db.query.user.findFirst({ where: eq(user.username, usernameValue) })
    if (!row) {
      return null
    }
    return {
      id: row.id!,
      username: row.username!,
      password: row.password!,
      role: (row.role || 'user') as User['role'],
      status: (row.status || 'active') as User['status'],
    }
  }
}
