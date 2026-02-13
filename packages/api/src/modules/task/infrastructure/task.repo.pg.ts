import { desc, eq, sql } from 'drizzle-orm'
import type { PostgresqlDB } from '@/shared/db/connection'
import { taskPg } from '@/modules/task/infrastructure/task.po'
import type { CreateTaskRecordInput, TaskRecord, TaskStatus } from '@/modules/task/task.entity'
import type { ITaskRepository } from '@/modules/task/task.repo.interface'

function toEntity(row: typeof taskPg.$inferSelect): TaskRecord {
  return {
    id: row.id!,
    type: row.type!,
    resourceId: row.resourceId!,
    status: row.status as TaskStatus,
    message: row.message ?? null,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
  }
}

export class PgTaskRepository implements ITaskRepository {
  constructor(private db: PostgresqlDB) {}

  async create(input: CreateTaskRecordInput): Promise<TaskRecord> {
    const [row] = await this.db.insert(taskPg).values({
      type: input.type,
      resourceId: input.resourceId,
      status: input.status ?? 'running',
      message: input.message ?? null,
    }).returning()
    return toEntity(row)
  }

  async findById(id: number): Promise<TaskRecord | null> {
    const row = await this.db.query.task.findFirst({ where: eq(taskPg.id, id) })
    return row ? toEntity(row) : null
  }

  async listByResourceId(resourceId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize
    const rows = await this.db.query.task.findMany({
      where: eq(taskPg.resourceId, resourceId),
      limit: pageSize,
      offset,
      orderBy: [desc(taskPg.createdAt)],
    })
    const totalRow = await this.db.select({ count: sql<number>`count(*)` }).from(taskPg).where(eq(taskPg.resourceId, resourceId))
    const total = totalRow[0]?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return { list: rows.map(toEntity), total, page, pageSize, totalPages }
  }

  async updateStatus(id: number, status: TaskStatus, message?: string | null): Promise<TaskRecord | null> {
    const [row] = await this.db.update(taskPg).set({
      status,
      message: message ?? null,
      updatedAt: Date.now(),
    }).where(eq(taskPg.id, id)).returning()
    return row ? toEntity(row) : null
  }
}
