import type { Logger } from 'pino'
import type { TaskService } from '@/modules/task/task.service'

export interface AppBindings {
  Variables: {
    requestId?: string
    logger?: Logger
    traceId?: string
    user?: {
      id: number | null
      username: string
      role: 'admin' | 'user' | null
    }
    taskService: TaskService
  }
}
