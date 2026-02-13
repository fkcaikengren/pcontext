import type { CreateTaskRecordInput, TaskRecord, TaskStatus } from './task.entity'
import type { PaginationVO } from '@/shared/vo'

export interface ITaskRepository {
  create: (input: CreateTaskRecordInput) => Promise<TaskRecord>
  findById: (id: number) => Promise<TaskRecord | null>
  listByResourceId: (resourceId: string, page: number, pageSize: number) => Promise<PaginationVO<TaskRecord>>
  updateStatus: (id: number, status: TaskStatus, message?: string | null) => Promise<TaskRecord | null>
}
