import type { Level } from 'pino'

export type TaskStatus = 'running' | 'completed' | 'failed'

export type TaskLogLevel = Level

export interface TaskLogMessage {
  message: string
  data?: unknown
}

export type TaskLogEntry = TaskLogMessage & {
  timestamp: number
  level: TaskLogLevel
}

export interface TaskLogEntity {
  id: number
  taskId: string
  logLevel: TaskLogLevel | null
  content: string | null
  createdAt: number
  extraData?: unknown | null
  traceId?: string | null
}

export type TaskLogEvent
  = | {
    type: 'log'
    entry: TaskLogEntry
  }
  | {
    type: 'end'
    status: Exclude<TaskStatus, 'running'>
  }

export type TaskType = string

export interface TaskEntity<T extends Record<string, any> = any> {
  id: string
  type: TaskType
  status: TaskStatus
  message: string | null
  extraData: T
  logsLength: number
  createdAt: number
  updatedAt: number
}
