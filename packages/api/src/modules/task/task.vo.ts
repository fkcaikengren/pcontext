import type { TaskStatus, TaskLogEntry } from './task.entity'

export interface TaskVO<TExtraData = unknown> {
  id: string
  status: TaskStatus
  createdAt: number
  updatedAt: number
  extraData?: TExtraData
  logs: TaskLogEntry[]
  logsLength: number
}

export interface TaskListVO {
  tasks: TaskVO[]
}
