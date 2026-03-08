import type { Redis } from 'ioredis'
import type { Readable } from 'node:stream'
import type { DocSourceEnumDTO, TaskDocDTO } from '@/modules/doc/doc.dto'
import type { TaskLogEntry as RedisTaskLogEntry } from '@/modules/task/infrastructure/mq/task-context'
import type { TaskLogEntry, TaskStatus } from '@/modules/task/task.entity'
import type { TaskVO } from '@/modules/task/task.vo'
import { PassThrough } from 'node:stream'
import { generateGitRepositoryData, generateWebsiteData } from '@/modules/doc/infrastructure/agent/engine/generate'
import { TaskContext } from '@/modules/task/infrastructure/mq/task-context'
import { TaskQueue } from '@/modules/task/infrastructure/mq/task-queue'
import { TaskWorker } from '@/modules/task/infrastructure/mq/task-worker'
import { getRepoDeps } from '@/shared/deps'
import { logger } from '@/shared/logger'
import { getRedis } from '@/shared/redis'
import { Cache, CacheableService } from '@/shared/redis/decorator'

@CacheableService('task')
export class TaskService {
  private worker: TaskWorker | null = null
  private queue: TaskQueue
  private cache: Redis

  private get taskRepo() {
    return getRepoDeps().taskRepo
  }

  private get docRepo() {
    return getRepoDeps().docRepo
  }

  constructor() {
    this.cache = getRedis()
    this.queue = new TaskQueue('task-queue', {
      // @ts-expect-error BullMQ 依赖ioredis版本较低5.9.3，实际ioredis 5.10.0
      connection: this.cache,
    })
    this.initWorker()
  }

  initWorker() {
    if (this.worker)
      return this.worker

    this.worker = new TaskWorker('task-queue', async (job) => {
      const ctx = new TaskContext(job, logger)
      const taskId = job.data.id
      const source = job.data?.source

      ctx.logInfo('Index Task started...')
      try {
        if (source === 'website') {
          await this.indexWebsiteDoc(ctx)
        }
        else if (source === 'github' || source === 'gitee') {
          await this.indexGitDoc(ctx, source)
        }
        else {
          throw new Error(`Unknown source: ${source}`)
        }

        await this.taskRepo.updateStatus(taskId, 'completed')
        ctx.logInfo('Task updated in database with status completed')
        await this.flushLogsToDB(taskId)
        ctx.logInfo('Task logs flushed to database')
      }
      catch (error: any) {
        await this.taskRepo.updateStatus(taskId, 'failed', error.message)
        ctx.logError(`Task updated in database with status failed: ${error.message}`)
        await this.flushLogsToDB(taskId)
        ctx.logInfo('Task logs flushed to database')
        throw error
      }
    }, this.cache)

    return this.worker
  }

  async submitTask(type: string, data: Omit<TaskDocDTO, 'id'>) {
    const taskEntity = await this.taskRepo.create({
      type,
      status: 'running',
      extraData: data,
    })

    const job = await this.queue.add(type, { ...data, id: taskEntity.id }, { jobId: taskEntity.id })
    return job
  }

  async listRecentTasks(limit: number = 20): Promise<TaskVO<TaskDocDTO>[]> {
    const tasks = await this.taskRepo.findRecentTasks(limit)

    return tasks.map((task) => {
      const extraData = task.extraData
        ? ({ id: task.id, ...(task.extraData as any) } as TaskDocDTO)
        : undefined

      return {
        id: task.id,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        extraData,
        logs: [],
        logsLength: task.logsLength || 0,
      }
    })
  }

  async getTaskDetail(taskId: string, logLimit: number = 100): Promise<TaskVO<TaskDocDTO> | null> {
    const task = await this.taskRepo.findById(taskId)
    if (!task)
      return null

    const status = task.status as TaskStatus
    const logs = status === 'running' ? [] : await this.getTaskLogs(taskId, logLimit)

    const extraData = task.extraData
      ? ({ id: taskId, ...(task.extraData as any) } as TaskDocDTO)
      : undefined

    return {
      id: taskId,
      status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      extraData,
      logs,
      logsLength: task.logsLength || logs.length,
    }
  }

  @Cache({ tags: () => ['task:list'], ttl: 300 })
  private async getTaskLogs(taskId: string, limit: number): Promise<TaskLogEntry[]> {
    const rows = await this.taskRepo.findRecentLogsByTaskId(taskId, limit)
    console.log('rows === ', rows)
    return rows.map(row => ({
      timestamp: row.createdAt,
      level: (row.logLevel ?? 'info') as any,
      message: row.content ?? '',
      data: row.extraData ?? undefined,
      traceId: row.traceId ?? taskId,
    })) satisfies TaskLogEntry[]
  }

  async indexWebsiteDoc(task: TaskContext<TaskDocDTO>) {
    if (!task.data || task.data.id == null) {
      throw new Error('task 必须包含 id')
    }

    const { slug, id: taskId, name: docName, url } = task.data
    const { tokens, snippets } = await generateWebsiteData({ url, bizDocId: slug }, task)
    task.logInfo(`Indexed website ${slug} successfully`)
    const record = await this.docRepo.create({ slug, name: docName, source: 'website', url, taskId, tokens, snippets })
    task.logInfo(`Add document ${slug} with slug ${record.slug} successfully`)
    return record
  }

  async indexGitDoc(task: TaskContext<TaskDocDTO>, source: DocSourceEnumDTO) {
    if (!task.data || task.data.id == null) {
      throw new Error('task 必须包含 id')
    }

    const { slug, id: taskId, name: docName, url } = task.data
    const { tokens, snippets } = await generateGitRepositoryData({ url, bizDocId: slug }, task)
    task.logInfo(`Indexed git repository ${slug} successfully`)
    const record = await this.docRepo.create({ slug, name: docName, source, url, taskId, tokens, snippets })
    task.logInfo(`Add document ${slug} with slug ${record.slug} successfully`)
    return record
  }

  async createLogStream(taskId: string): Promise<Readable> {
    console.log('createLogStream for taskId === ', taskId)
    const stream = new PassThrough({ objectMode: true })
    const channel = `task:${taskId}:events`
    const listKey = `task:${taskId}:logs`

    // 判断是否存在job，不存在则结束流；存在说明job未结束，监听job的log；
    const job = await this.queue.getJob(taskId)
    if (!job) {
      stream.end()
      return stream
    }

    const existingLogs = await this.cache.lrange(listKey, 0, -1)
    for (const logStr of existingLogs) {
      try {
        const entry = JSON.parse(logStr) as TaskLogEntry
        stream.write({ type: 'log', entry })
      }
      catch {
        logger.error(`Failed to parse log entry: ${logStr}`)
      }
    }

    const subRedis = this.cache.duplicate()
    await subRedis.subscribe(channel)

    subRedis.on('message', (ch, message) => {
      if (ch !== channel)
        return
      try {
        const event = JSON.parse(message)
        stream.write(event)

        if (event.type === 'end') {
          subRedis.unsubscribe()
          subRedis.quit()
          stream.end()
        }
      }
      catch {
        logger.error(`Failed to parse event: ${message}`)
      }
    })

    stream.on('close', () => {
      subRedis.unsubscribe()
      subRedis.quit()
    })

    return stream
  }

  /**
   * 将 Redis 中的任务日志批量写入数据库
   * @param taskId 任务 ID
   * @param deleteAfterFlush 写入后是否删除 Redis 中的日志 key，默认 true
   */
  async flushLogsToDB(taskId: string, deleteAfterFlush: boolean = true): Promise<number> {
    const listKey = `task:${taskId}:logs`
    const logs = await this.cache.lrange(listKey, 0, -1)

    if (logs.length === 0) {
      logger.info(`[TaskService] No logs to flush for task ${taskId}`)
      return 0
    }

    const logEntries = logs.map((logStr) => {
      const entry = JSON.parse(logStr) as RedisTaskLogEntry
      return {
        taskId,
        logLevel: entry.level,
        content: entry.message,
        createdAt: entry.timestamp,
        extraData: entry.data,
        traceId: entry.traceId,
      }
    })

    await this.taskRepo.createLogs(logEntries)
    logger.info(`[TaskService] Flushed ${logEntries.length} logs to DB for task ${taskId}`)

    if (deleteAfterFlush) {
      await this.cache.del(listKey)
      logger.info(`[TaskService] Deleted Redis log key for task ${taskId}`)
    }

    return logEntries.length
  }
}
