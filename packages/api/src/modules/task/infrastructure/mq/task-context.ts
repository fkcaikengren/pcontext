import type { Job } from 'bullmq'
import type { Logger } from 'pino'
import { redis } from '@/shared/redis'

export interface TaskLogEntry {
  timestamp: number
  level: string
  message: string
  data?: any
  traceId: string
}

export class TaskContext<T = any> {
  readonly job: Job<T>
  readonly logger: Logger
  readonly id: string
  readonly data: T
  readonly traceId: string

  static readonly LOG_MAX_ENTRIES = 150
  static readonly LOG_TRIM_TO_ENTRIES = 100

  constructor(job: Job<T>, logger: Logger) {
    this.job = job
    this.logger = logger
    this.id = job.id!
    this.data = job.data
    this.traceId = (job.data as any).traceId || job.id!
  }

  async log(level: 'info' | 'error' | 'warn', message: string, data?: any) {
    const entry: TaskLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      traceId: this.traceId,
    }

    const payload = JSON.stringify(entry)
    const key = `task:${this.id}:logs`

    // 1. Write to Redis List (buffer) with Lua script for trim strategy
    // Trim strategy: keep max LOG_MAX_ENTRIES entries, trim to LOG_TRIM_TO_ENTRIES when exceeded
    const luaScript = `
      redis.call('RPUSH', KEYS[1], ARGV[1])
      local len = redis.call('LLEN', KEYS[1])
      if len > tonumber(ARGV[2]) then
        redis.call('LTRIM', KEYS[1], -tonumber(ARGV[3]), -1)
      end
      redis.call('EXPIRE', KEYS[1], ARGV[4])
      return len
    `
    await redis.eval(
      luaScript,
      1,
      key,
      payload,
      TaskContext.LOG_MAX_ENTRIES,
      TaskContext.LOG_TRIM_TO_ENTRIES,
      '14400',
    )

    // 2. Publish real-time event for SSE
    await redis.publish(`task:${this.id}:events`, JSON.stringify({
      type: 'log',
      entry,
    }))

    // 3. System log
    const logFn = this.logger[level] || this.logger.info
    logFn.call(this.logger, `[Task ${this.id}] ${message}`, data)
  }

  private parseLogData(data: string | object, msg: string = '') {
    if (typeof data === 'string') {
      return { message: data, extraData: undefined }
    }
    return { message: msg, extraData: data }
  }

  logInfo(data: string | object, msg: string = '') {
    const { message, extraData } = this.parseLogData(data, msg)
    return this.log('info', message, extraData)
  }

  logError(data: string | object, msg: string = '') {
    const { message, extraData } = this.parseLogData(data, msg)
    return this.log('error', message, extraData)
  }

  logWarn(data: string | object, msg: string = '') {
    const { message, extraData } = this.parseLogData(data, msg)
    return this.log('warn', message, extraData)
  }
}
