import type { AppBindings } from '../types'
import { createMiddleware } from 'hono/factory'
import { getServiceDeps } from '@/shared/deps'

export function services() {
  return createMiddleware<AppBindings>(async (c, next) => {
    const serviceDeps = getServiceDeps()
    c.set('taskService', serviceDeps.taskService)
    c.set('rankService', serviceDeps.rankService)
    c.set('chatService', serviceDeps.chatService)
    c.set('docService', serviceDeps.docService)
    await next()
  })
}
