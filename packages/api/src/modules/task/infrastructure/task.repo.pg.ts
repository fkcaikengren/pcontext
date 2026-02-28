import type { TaskLogPgPO, TaskPgPO } from '@/modules/task/infrastructure/task.po'
import type { CreateTaskDTO, CreateTaskLogDTO } from '@/modules/task/task.dto'
import type { TaskEntity, TaskLogEntity, TaskStatus } from '@/modules/task/task.entity'
import type { ITaskRepository } from '@/modules/task/task.repo.interface'
import type { PostgresqlDB } from '@/shared/db/connection'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { taskLogPg, taskPg } from '@/modules/task/infrastructure/task.po'
import { redis } from '@/shared/redis'

function mapper(row: TaskPgPO): TaskEntity
function mapper(row: TaskLogPgPO): TaskLogEntity
function mapper(row: TaskPgPO | TaskLogPgPO): TaskEntity | TaskLogEntity {
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
    createdAt: row.createdAt ? row.createdAt.getTime() : Date.now(),
    extraData: row.extraData ?? null,
    traceId: row.traceId ?? null,
  }
}

export class PgTaskRepository implements ITaskRepository {
  constructor(private db: PostgresqlDB) {}

  async create(input: CreateTaskDTO): Promise<TaskEntity> {
    const [row] = await this.db.insert(taskPg).values({
      type: input.type,
      status: input.status ?? 'running',
      message: input.message ?? null,
      extraData: input.extraData ?? null,
    }).returning()
    return mapper(row)
  }

  async findById(id: string): Promise<TaskEntity | null> {
    const row = await this.db.query.task.findFirst({ where: eq(taskPg.id, id) })
    return row ? mapper(row) : null
  }

  async updateStatus(id: string, status: TaskStatus, message?: string | null): Promise<TaskEntity | null> {
    const [row] = await this.db.update(taskPg).set({
      status,
      message: message ?? null,
      updatedAt: Date.now(),
    }).where(eq(taskPg.id, id)).returning()
    return row ? mapper(row) : null
  }

  async createLog(input: CreateTaskLogDTO): Promise<TaskLogEntity> {
    const [row] = await this.db.insert(taskLogPg).values({
      taskId: input.taskId,
      logLevel: input.logLevel ?? null,
      content: input.content ?? null,
      createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
      extraData: input.extraData ?? null,
      traceId: input.traceId ?? null,
    }).returning()
    return mapper(row)
  }

  async createLogs(inputs: CreateTaskLogDTO[]): Promise<void> {
    if (inputs.length === 0)
      return
    await this.db.insert(taskLogPg).values(inputs.map(input => ({
      taskId: input.taskId,
      logLevel: input.logLevel ?? null,
      content: input.content ?? null,
      createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
      extraData: input.extraData ?? null,
      traceId: input.traceId ?? null,
    }))).returning()
  }

  async findLogsByTaskId(taskId: string): Promise<TaskLogEntity[]> {
    const rows = await this.db.select().from(taskLogPg).where(eq(taskLogPg.taskId, taskId)).orderBy(taskLogPg.createdAt)
    return rows.map(row => mapper(row))
  }

  async findRecentLogsByTaskId(taskId: string, limit: number): Promise<TaskLogEntity[]> {
    const listKey = `task:${taskId}:logs:limit_${limit}`
    const redisLogs = await redis.lrange(listKey, -Math.max(limit, 1), -1)

    const parsedRedisLogs: TaskLogEntity[] = []
    for (const logStr of redisLogs) {
      try {
        const entry = JSON.parse(logStr)
        if (entry && typeof entry.timestamp === 'number' && typeof entry.level === 'string') {
          parsedRedisLogs.push({
            id: 0,
            taskId,
            logLevel: entry.level,
            content: entry.message ?? '',
            createdAt: entry.timestamp,
            extraData: entry.data ?? null,
            traceId: entry.traceId ?? taskId,
          })
        }
      }
      catch {}
    }

    if (parsedRedisLogs.length > 0)
      return parsedRedisLogs

    const rows = await this.db.select().from(taskLogPg).where(eq(taskLogPg.taskId, taskId)).orderBy(asc(taskLogPg.createdAt)).limit(limit)
    const entities = rows.map(row => mapper(row))

    if (entities.length > 0) {
      const logEntries = entities.map(entity => JSON.stringify({
        timestamp: entity.createdAt,
        level: entity.logLevel ?? 'info',
        message: entity.content ?? '',
        data: entity.extraData ?? undefined,
        traceId: entity.traceId ?? taskId,
      }))
      await redis.rpush(listKey, ...logEntries)
      await redis.expire(listKey, 3600)
    }

    return entities
  }

  async findRecentTasks(limit: number): Promise<TaskEntity[]> {
    const rows = await this.db.select().from(taskPg).orderBy(desc(taskPg.createdAt)).limit(limit)
    return rows.map(row => mapper(row))
  }
}
