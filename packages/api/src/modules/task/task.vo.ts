import type { TaskLogEntry, TaskStatus } from './task.entity'

export { TaskStatus }

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
