import type { CreateTaskDTO, CreateTaskLogDTO } from './task.dto'
import type { TaskEntity, TaskLogEntity, TaskStatus } from './task.entity'
import type { PaginationVO } from '@/shared/vo'

export interface ITaskRepository {
  create: (input: CreateTaskDTO) => Promise<TaskEntity>
  findById: (id: string) => Promise<TaskEntity | null>
  updateStatus: (id: string, status: TaskStatus, message?: string | null) => Promise<TaskEntity | null>
  createLog: (input: CreateTaskLogDTO) => Promise<TaskLogEntity>
  createLogs: (inputs: CreateTaskLogDTO[]) => Promise<void>
  findLogsByTaskId: (taskId: string) => Promise<TaskLogEntity[]> // TODO: 分页查询
  findRecentLogsByTaskId: (taskId: string, limit: number) => Promise<TaskLogEntity[]>
  findRecentTasks: (limit: number) => Promise<TaskEntity[]>
}
