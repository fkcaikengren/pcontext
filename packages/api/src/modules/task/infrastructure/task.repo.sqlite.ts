import type { CreateTaskDTO, CreateTaskLogDTO } from '@/modules/task/task.dto'
import type { TaskEntity, TaskLogEntity, TaskStatus } from '@/modules/task/task.entity'
import type { ITaskRepository } from '@/modules/task/task.repo.interface'
import type { SqliteDB } from '@/shared/db/connection'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { taskLogSqlite, taskSqlite } from '@/modules/task/infrastructure/task.po'

type TaskSqlitePO = typeof taskSqlite.$inferSelect
type TaskLogSqlitePO = typeof taskLogSqlite.$inferSelect

function mapper(row: TaskSqlitePO): TaskEntity
function mapper(row: TaskLogSqlitePO): TaskLogEntity
function mapper(row: TaskSqlitePO | TaskLogSqlitePO): TaskEntity | TaskLogEntity {
  if ('type' in row) {
    return {
      id: row.id!,
      type: row.type!,
      status: row.status as TaskStatus,
      message: row.message ?? null,
      extraData: row.extraData ?? null,
      logsLength: row.logsLength ?? 0,
      createdAt: row.createdAt as number,
      updatedAt: row.updatedAt as number,
    }
  }

  return {
    id: row.id!,
    taskId: row.taskId!,
    logLevel: (row.logLevel as any) ?? null,
    content: row.content ?? null,
    createdAt: row.createdAt as number,
    extraData: row.extraData ?? null,
    traceId: row.traceId ?? null,
  }
}

export class SqliteTaskRepository implements ITaskRepository {
  constructor(private db: SqliteDB) {}

  async create(input: CreateTaskDTO): Promise<TaskEntity> {
    const [row] = await this.db.insert(taskSqlite).values({
      id: uuidv7(),
      type: input.type,
      status: input.status ?? 'running',
      message: input.message ?? null,
      extraData: input.extraData ?? null,
      updatedAt: Date.now(),
    }).returning()
    return mapper(row)
  }

  async findById(id: string): Promise<TaskEntity | null> {
    const row = await this.db.query.task.findFirst({ where: eq(taskSqlite.id, id) })
    return row ? mapper(row) : null
  }

  async updateStatus(id: string, status: TaskStatus, message?: string | null): Promise<TaskEntity | null> {
    const [row] = await this.db.update(taskSqlite).set({
      status,
      message: message ?? null,
      updatedAt: Date.now(),
    }).where(eq(taskSqlite.id, id)).returning()
    return row ? mapper(row) : null
  }

  async createLog(input: CreateTaskLogDTO): Promise<TaskLogEntity> {
    const [row] = await this.db.insert(taskLogSqlite).values({
      taskId: input.taskId,
      logLevel: input.logLevel ?? null,
      content: input.content ?? null,
      createdAt: input.createdAt ?? undefined,
      extraData: input.extraData ?? null,
      traceId: input.traceId ?? null,
    }).returning()
    return mapper(row)
  }

  async createLogs(inputs: CreateTaskLogDTO[]): Promise<void> {
    if (inputs.length === 0)
      return
    await this.db.insert(taskLogSqlite).values(inputs.map(input => ({
      taskId: input.taskId,
      logLevel: input.logLevel ?? null,
      content: input.content ?? null,
      createdAt: input.createdAt ?? undefined,
      extraData: input.extraData ?? null,
      traceId: input.traceId ?? null,
    }))).returning()
  }

  async findLogsByTaskId(taskId: string): Promise<TaskLogEntity[]> {
    const rows = await this.db.select().from(taskLogSqlite).where(eq(taskLogSqlite.taskId, taskId)).orderBy(taskLogSqlite.createdAt)
    return rows.map(row => mapper(row))
  }

  async findRecentLogsByTaskId(taskId: string, limit: number): Promise<TaskLogEntity[]> {
    const rows = await this.db.select().from(taskLogSqlite).where(eq(taskLogSqlite.taskId, taskId)).orderBy(asc(taskLogSqlite.createdAt)).limit(limit)
    return rows.map(row => mapper(row))
  }

  async findRecentTasks(limit: number): Promise<TaskEntity[]> {
    const rows = await this.db.select().from(taskSqlite).orderBy(desc(taskSqlite.createdAt)).limit(limit)
    return rows.map(row => mapper(row))
  }
}
