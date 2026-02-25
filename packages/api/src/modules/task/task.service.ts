import type { Readable } from 'node:stream'
import type { DocSourceEnumDTO, TaskDocDTO } from '@/modules/doc/doc.dto'
import type { TaskLogEntry, TaskStatus } from '@/modules/task/task.entity'
import type { TaskVO } from '@/modules/task/task.vo'
import { PassThrough } from 'node:stream'
import { generateGitRepositoryData, generateWebsiteData } from '@/modules/doc/infrastructure/agent/engine/generate'
import { TaskContext } from '@/modules/task/infrastructure/mq/task-context'
import { TaskQueue } from '@/modules/task/infrastructure/mq/task-queue'
import { TaskWorker } from '@/modules/task/infrastructure/mq/task-worker'
import { getRepoDeps } from '@/shared/deps'
import { logger } from '@/shared/logger'
import { redis } from '@/shared/redis'

export class TaskService {
  private worker: TaskWorker | null = null
  private queue: TaskQueue

  private get taskRepo() {
    return getRepoDeps().taskRepo
  }

  private get docRepo() {
    return getRepoDeps().docRepo
  }

  constructor() {
    this.queue = new TaskQueue('task-queue')
    this.initWorker()
  }

  initWorker() {
    if (this.worker)
      return this.worker

    this.worker = new TaskWorker('task-queue', async (job) => {
      const ctx = new TaskContext(job, logger)
      const taskId = job.data.id
      const source = job.data?.source

      ctx.logInfo('Task started')
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
      }
      catch (error: any) {
        await this.taskRepo.updateStatus(taskId, 'failed', error.message)
        ctx.logError(`Task updated in database with status failed: ${error.message}`)
        throw error
      }
    })

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

  async listRunningTasksFromQueue(limit: number = 100): Promise<TaskVO<TaskDocDTO>[]> {
    const jobs = await this.queue.getJobs(['active', 'waiting'], 0, Math.max(limit - 1, 0))

    const jobMap = new Map<string, any>()
    for (const job of jobs) {
      if (job?.id)
        jobMap.set(job.id, job)
    }

    return Array.from(jobMap.values())
      .sort((a, b) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0))
      .map(job => ({
        id: String(job.id),
        status: 'running',
        createdAt: job.timestamp ?? Date.now(),
        updatedAt: job.processedOn ?? job.timestamp ?? Date.now(),
        extraData: job.data as TaskDocDTO,
        logs: [],
        logsLength: 0,
      }))
  }

  async listRecentTasksFromDb(limit: number = 20): Promise<TaskVO<TaskDocDTO>[]> {
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

  private async getTaskLogs(taskId: string, limit: number): Promise<TaskLogEntry[]> {
    try {
      const rows = await this.taskRepo.findRecentLogsByTaskId(taskId, limit)
      return rows.map(row => ({
        timestamp: row.createdAt,
        level: (row.logLevel ?? 'info') as any,
        message: row.content ?? '',
        data: row.extraData ?? undefined,
        traceId: row.traceId ?? taskId,
      })) satisfies TaskLogEntry[]
    }
    catch {
      return []
    }
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
    const stream = new PassThrough({ objectMode: true })
    const channel = `task:${taskId}:events`
    const listKey = `task:${taskId}:logs`

    // 判断是否存在job，不存在则结束流；存在说明job未结束，监听job的log；
    const job = await this.queue.getJob(taskId)
    if (!job) {
      stream.end()
      return stream
    }

    const existingLogs = await redis.lrange(listKey, 0, -1)
    for (const logStr of existingLogs) {
      try {
        const entry = JSON.parse(logStr) as TaskLogEntry
        stream.write({ type: 'log', entry })
      }
      catch {
        logger.error(`Failed to parse log entry: ${logStr}`)
      }
    }

    const subRedis = redis.duplicate()
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
}
