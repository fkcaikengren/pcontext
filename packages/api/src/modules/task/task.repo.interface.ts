import type { TaskLogEntity, TaskEntity, TaskStatus } from './task.entity'
import type { CreateTaskDTO, CreateTaskLogDTO } from './task.dto'
import type { PaginationVO } from '@/shared/vo'

export interface ITaskRepository {
  create: (input: CreateTaskDTO) => Promise<TaskEntity>
  findById: (id: number) => Promise<TaskEntity | null>
  updateStatus: (id: number, status: TaskStatus, message?: string | null) => Promise<TaskEntity | null>
  createLog: (input: CreateTaskLogDTO) => Promise<TaskLogEntity>
  createLogs: (inputs: CreateTaskLogDTO[]) => Promise<void>
}
