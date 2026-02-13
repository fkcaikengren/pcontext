import type { Logger } from 'pino'

export type AppBindings = {
  Variables: {
    requestId?: string
    logger?: Logger
    traceId?: string
    user?: {
      id: number | null
      username: string
      role: 'admin' | 'user' | null
    }
  }
}
