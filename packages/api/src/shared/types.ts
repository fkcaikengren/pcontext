import type { Logger } from 'pino'
import type { ChatService } from '@/modules/doc/chat.service'
import type { DocService } from '@/modules/doc/doc.service'
import type { RankService } from '@/modules/rank/rank.service'
import type { TaskService } from '@/modules/task/task.service'

export interface ApiSuccess<T = unknown> {
  code: number
  data: T
  message: string
}

export interface ApiError<T = unknown> {
  code: number
  data: T | null
  message: string
}

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
    rankService: RankService
    chatService: ChatService
    docService: DocService
  }
}
