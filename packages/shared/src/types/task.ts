import type {Level} from 'pino'
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

export type TaskLogEvent =
  | {
      type: 'log'
      entry: TaskLogEntry
    }
  | {
      type: 'end'
      status: Exclude<TaskStatus, 'running'>
    }


export interface DocTaskModel {
  name: string,
  source: string,
  url: string,
}

export interface TaskEntity<TModel> {
  id: string
  status: TaskStatus
  createdAt: number
  updatedAt: number
  model?: TModel
  logs: TaskLogEntry[]
}
