import type { Level } from 'pino'

export type TaskStatus = 'running' | 'completed' | 'failed'

export type TaskLogLevel = Level

export type TaskLogMessage = {
  message: string
  data?: unknown
}

export type TaskLogEntry = TaskLogMessage & {
  timestamp: number
  level: TaskLogLevel
}

export type TaskLogEntity = {
  id: number
  taskId: string
  logLevel: TaskLogLevel | null
  content: string | null
  createdAt: number
  extraData?: unknown | null
  traceId?: string | null
}

export type TaskLogEvent =
  | {
      type: 'log'
      entry: TaskLogEntry
    }
  | {
      type: 'end'
      status: Exclude<TaskStatus, 'running'>
    }

export interface LogTaskEntity<TExtraData> {
  id: string
  status: TaskStatus
  createdAt: number
  updatedAt: number
  extraData?: TExtraData
  logs: TaskLogEntry[]
  logsLength: number
}

export type TaskType = string

export type TaskEntity = {
  id: number
  type: TaskType
  status: TaskStatus
  message: string | null
  extraData?: unknown | null
  logsLength: number
  createdAt: number
  updatedAt: number
}
