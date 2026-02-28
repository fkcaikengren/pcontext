import type { Logger } from 'pino'
import type { RankService } from '@/modules/rank/rank.service'
import type { TaskService } from '@/modules/task/task.service'
import type { ChatService } from '@/modules/doc/chat.service'

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
  }
}
