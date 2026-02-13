import { eq } from 'drizzle-orm'
import type { SqliteDB } from '@/shared/db/connection'
import type { PaginationVO } from '@/shared/vo'
import type { AuthUserRecord, IUserRepository } from '@/modules/user/user.repo.interface'
import type { CreateUserDTO, UpdateSelfDTO, UpdateUserDTO } from '@/modules/user/user.dto'
import type { UserEntity } from '@/modules/user/user.entity'
import { userSqlite, type UserSqlitePO } from '@/modules/user/infrastructure/user.po'

function mapper(row: UserSqlitePO): UserEntity {
  return {
    id: row.id!,
    username: row.username!,
    name: row.name!,
    phone: row.phone!,
    email: row.email!,
    role: (row.role || 'user') as UserEntity['role'],
    status: (row.status || 'active') as UserEntity['status'],
    createdAt: new Date(row.createdAt as number),
    updatedAt: new Date(row.updatedAt as number),
  }
}

export class SqliteUserRepository implements IUserRepository {
  private db: SqliteDB

  constructor(db: SqliteDB) {
    this.db = db
  }

  async findById(id: number): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({ where: eq(userSqlite.id, id) })
    return row ? mapper(row) : null
  }

  async findByUsername(usernameValue: string): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({ where: eq(userSqlite.username, usernameValue) })
    return row ? mapper(row) : null
  }

  async findByPhone(phoneValue: string): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({ where: eq(userSqlite.phone, phoneValue) })
    return row ? mapper(row) : null
  }

  async findByEmail(emailValue: string): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({ where: eq(userSqlite.email, emailValue) })
    return row ? mapper(row) : null
  }

  async list(page: number, pageSize: number, filters?: { name?: string }): Promise<PaginationVO<UserEntity>> {
    const offset = (page - 1) * pageSize
    const rows = await this.db.query.user.findMany({
      limit: pageSize,
      offset,
      where: filters?.name ? (fields, { like }) => like(fields.name, `%${filters.name}%`) : undefined,
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    })
    const totalRows = await this.db.query.user.findMany({
      where: filters?.name ? (fields, { like }) => like(fields.name, `%${filters.name}%`) : undefined,
    })
    const list = rows.map(mapper)
    const total = totalRows.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return { list, total, page, pageSize, totalPages }
  }

  async create(input: CreateUserDTO): Promise<UserEntity> {
    const [row] = await this.db.insert(userSqlite).values({
      username: input.username,
      password: input.password,
      name: input.name,
      phone: input.phone,
      email: input.email,
      role: input.role ?? 'user',
      status: input.status ?? 'active',
    }).returning()
    return mapper(row)
  }

  async updateById(id: number, input: UpdateUserDTO): Promise<UserEntity | null> {
    const [row] = await this.db.update(userSqlite).set({
      username: input.username,
      password: input.password,
      name: input.name,
      phone: input.phone,
      email: input.email,
      role: input.role,
      status: input.status,
      updatedAt: Date.now(),
    }).where(eq(userSqlite.id, id)).returning()
    return row ? mapper(row) : null
  }

  async updateSelf(id: number, input: UpdateSelfDTO): Promise<UserEntity | null> {
    const [row] = await this.db.update(userSqlite).set({
      name: input.name,
      password: input.password,
      phone: input.phone,
      email: input.email,
      updatedAt: Date.now(),
    }).where(eq(userSqlite.id, id)).returning()
    return row ? mapper(row) : null
  }

  async findAuthByUsername(usernameValue: string): Promise<AuthUserRecord | null> {
    const row = await this.db.query.user.findFirst({ where: eq(userSqlite.username, usernameValue) })
    if (!row) {
      return null
    }
    return {
      id: row.id!,
      username: row.username!,
      password: row.password!,
      role: (row.role || 'user') as UserEntity['role'],
      status: (row.status || 'active') as UserEntity['status'],
    }
  }
}
