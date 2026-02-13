export type TaskStatus = 'running' | 'completed' | 'failed'

export type TaskType = string

export type TaskRecord = {
  id: number
  type: TaskType
  resourceId: string
  status: TaskStatus
  message: string | null
  createdAt: number
  updatedAt: number
}

export type CreateTaskRecordInput = {
  type: TaskType
  resourceId: string
  status?: TaskStatus
  message?: string | null
}
