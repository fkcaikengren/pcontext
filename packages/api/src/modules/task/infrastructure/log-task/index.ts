import { randomUUID } from 'node:crypto'
import { logger } from '@/shared/logger'
import { getRepoDeps } from '@/shared/deps'
import type {
  TaskStatus,
  TaskLogLevel,
  TaskLogEntry,
  TaskLogEvent,
  TaskLogMessage,
} from '../../task.entity'
import type { CreateTaskLogDTO } from '../../task.dto'
import type { ITaskRepository } from '../../task.repo.interface'
import { EventEmitter } from 'node:events'
import { PassThrough, Readable } from 'node:stream'

export type TaskLogListener = (event: TaskLogEvent) => void | Promise<void>

export type TaskManagerOptions = {
  taskTTL?: number
  maxLogsPerTask?: number
  taskRepoGetter?: () => ITaskRepository | null
}

const COMPLETED_EVENT = { type: 'end', status: 'completed' }
const FAILED_EVENT = { type: 'end', status: 'failed' }
const DEFAULT_MAX_LOGS_PER_TASK = 100

function getTaskRepoSafely(): ITaskRepository | null {
  try {
    return getRepoDeps().taskRepo
  } catch {
    return null
  }
}

export class Task<TModel> extends EventEmitter {
  manager: TaskManager<TModel>
  id: string
  status: TaskStatus
  createdAt: number
  updatedAt: number
  extraData?: TModel
  logs: TaskLogEntry[]
  logsLength: number
  dataEvent: symbol
  endEvent: symbol
  private persistQueue: Promise<void>

  constructor(manager: TaskManager<TModel>, extraData?: TModel) {
    super()
    const now = Date.now()
    this.manager = manager
    this.id = randomUUID()
    this.status = 'running'
    this.createdAt = now
    this.updatedAt = now
    this.extraData = extraData
    this.logs = []
    this.logsLength = 0
    this.persistQueue = Promise.resolve()

    this.dataEvent = Symbol('data')
    this.endEvent = Symbol('end')
  }

  log(level: TaskLogLevel, data: string | object, msg: string = '') {
    if (this.status !== 'running') return

    const logMsg = typeof data === 'string' ? { message: data } : { message: msg, data }
    const entry: TaskLogEntry = {
      timestamp: Date.now(),
      level,
      ...logMsg,
    }

    this.logs.push(entry)
    this.logsLength += 1
    this.updatedAt = entry.timestamp
    const overflow = this.logs.length - this.manager.maxLogsPerTask
    if (overflow > 10) {
      const overflowLogs = this.logs.splice(0, overflow)
      this.persist(overflowLogs)
    }

    this.emit(this.dataEvent, { type: 'log', entry })
    return logger[level]?.(msg)
  }

  logInfo(data: string | object, msg: string = '') {
    return this.log('info', data, msg)
  }

  endWithCompleted(): void {
    this.status = 'completed'
    this.flushAllLogs()
    logger.info(`[Task] task ${this.id} end with status completed`)
    this.emit(this.endEvent, COMPLETED_EVENT)
  }

  endWithFailed(): void {
    this.status = 'failed'
    this.flushAllLogs()
    logger.error(`[Task] task ${this.id} end with status failed`)
    this.emit(this.endEvent, FAILED_EVENT)
  }

  createLogStream(): Readable {
    const output = new PassThrough({ objectMode: true })

    for (const log of this.logs) {
      output.write({ type: 'log', entry: log })
    }

    if (this.status === 'completed') {
      output.write(COMPLETED_EVENT)
      return output
    } else if (this.status === 'failed') {
      output.write(FAILED_EVENT)
      return output
    }

    const onData = (payload: any) => {
      output.write({ type: payload.type, entry: payload.entry })
    }

    const onEnd = (payload: any) => {
      output.write({ type: payload.type, status: payload.status })
      output.end()
      setTimeout(() => {
        this.manager.removeTask(this.id)
      }, this.manager.taskTTL * 1000)
    }

    const cleanup = () => {
      this.off(this.dataEvent, onData)
      this.off(this.endEvent, onEnd)
    }

    this.on(this.dataEvent, onData)
    this.on(this.endEvent, onEnd)

    output.on('close', () => {
      cleanup()
    })

    return output
  }

  private flushAllLogs() {
    if (this.logs.length === 0) return
    const batch = this.logs.splice(0, this.logs.length)
    this.persist(batch)
  }

  private persist(entries: TaskLogEntry[]) {
    if (entries.length === 0) return
    this.persistQueue = this.persistQueue
      .then(() => this.persistBatch(entries))
      .catch((err) => {
        logger.error(err, `[Task] persist logs failed, taskId: ${this.id}`)
      })
  }

  private async persistBatch(entries: TaskLogEntry[]) {
    const repo = this.manager.getTaskRepo()
    if (!repo) {
      this.restoreLogs(entries)
      return
    }

    try {
      await repo.createLogs(entries.map(entry => this.toCreateLogDTO(entry)))
    } catch (err) {
      this.restoreLogs(entries)
      throw err
    }
  }

  private restoreLogs(entries: TaskLogEntry[]) {
    if (entries.length === 0) return
    this.logs = entries.concat(this.logs)
    const overflow = this.logs.length - this.manager.maxLogsPerTask
    if (overflow > 0) {
      this.logs.splice(0, overflow)
    }
  }

  private toCreateLogDTO(entry: TaskLogEntry): CreateTaskLogDTO {
    return {
      taskId: this.id,
      logLevel: entry.level,
      content: entry.message ?? null,
      createdAt: entry.timestamp,
      extraData: entry.data ?? null,
    }
  }
}

export class TaskManager<TModel = Record<string, unknown>> {
  private readonly tasks = new Map<string, Task<TModel>>()

  readonly taskTTL: number
  readonly maxLogsPerTask: number
  readonly taskRepoGetter: () => ITaskRepository | null

  constructor(options?: TaskManagerOptions) {
    this.taskTTL = options?.taskTTL ?? 30 * 60
    this.maxLogsPerTask = options?.maxLogsPerTask ?? DEFAULT_MAX_LOGS_PER_TASK
    this.taskRepoGetter =  getTaskRepoSafely
  }

  createTask(extraData?: TModel): Task<TModel> {
    const task: Task<TModel> = new Task(this, extraData)
    this.tasks.set(task.id, task)
    return task
  }

  listTasks(): Task<TModel>[] {
    return Array.from(this.tasks.values())
  }

  getTask(id: string): Task<TModel> | null {
    return this.tasks.get(id) ?? null
  }

  removeTask(id: string) {
    return this.tasks.delete(id)
  }

  getTaskRepo(): ITaskRepository | null {
    return this.taskRepoGetter()
  }
}



export type DefaultTaskModel = Record<string, unknown>

export function createTaskManager<TModel>(options?: TaskManagerOptions) {
  return new TaskManager<TModel>(options)
}
