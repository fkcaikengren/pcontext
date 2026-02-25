import type { UserPgPO } from './user.po'
import type { CreateUserDTO, UpdateSelfDTO, UpdateUserDTO } from '@/modules/user/user.dto'
import type { UserEntity } from '@/modules/user/user.entity'
import type { AuthUserRecord, IUserRepository } from '@/modules/user/user.repo.interface'
import type { PostgresqlDB } from '@/shared/db/connection'
import type { PaginationVO } from '@/shared/vo'
import { and, count, eq, like } from 'drizzle-orm'
import { userPg } from './user.po'

function mapper(row: UserPgPO): UserEntity {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role as UserEntity['role'],
    status: row.status as UserEntity['status'],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export class PgUserRepository implements IUserRepository {
  private db: PostgresqlDB

  constructor(db: PostgresqlDB) {
    this.db = db
  }

  async findById(id: number): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({ where: eq(userPg.id, id) })
    return row ? mapper(row) : null
  }

  async findByUsername(usernameValue: string): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({ where: eq(userPg.username, usernameValue) })
    return row ? mapper(row) : null
  }

  async findByPhone(phoneValue: string): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({ where: eq(userPg.phone, phoneValue) })
    return row ? mapper(row) : null
  }

  async findByEmail(emailValue: string): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({ where: eq(userPg.email, emailValue) })
    return row ? mapper(row) : null
  }

  async list(page: number, pageSize: number, filters?: { name?: string }): Promise<PaginationVO<UserEntity>> {
    const offset = (page - 1) * pageSize

    const where = (fields: any) => {
      return filters?.name ? like(fields.name, `%${filters.name}%`) : undefined
    }

    const [rows, [totalResult]] = await Promise.all([
      this.db.query.user.findMany({
        limit: pageSize,
        offset,
        where,
        orderBy: (fields, { desc }) => [desc(fields.createdAt)],
      }),
      this.db.select({ value: count() }).from(userPg).where(where(userPg)),
    ])

    const list = rows.map(mapper)
    const total = Number(totalResult?.value ?? 0)
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return { list, total, page, pageSize, totalPages }
  }

  async create(input: CreateUserDTO): Promise<UserEntity> {
    const [row] = await this.db.insert(userPg).values({
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
    const [row] = await this.db.update(userPg).set({
      username: input.username,
      password: input.password,
      name: input.name,
      phone: input.phone,
      email: input.email,
      role: input.role,
      status: input.status,
      updatedAt: Date.now(),
    }).where(eq(userPg.id, id)).returning()
    return row ? mapper(row) : null
  }

  async updateSelf(id: number, input: UpdateSelfDTO): Promise<UserEntity | null> {
    const [row] = await this.db.update(userPg).set({
      name: input.name,
      password: input.password,
      phone: input.phone,
      email: input.email,
      updatedAt: Date.now(),
    }).where(eq(userPg.id, id)).returning()
    return row ? mapper(row) : null
  }

  async findAuthByUsername(usernameValue: string): Promise<AuthUserRecord | null> {
    const row = await this.db.query.user.findFirst({ where: eq(userPg.username, usernameValue) })
    if (!row) {
      return null
    }
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role as UserEntity['role'],
      status: row.status as UserEntity['status'],
    }
  }
}
