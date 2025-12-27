import type { MiddlewareHandler } from 'hono'
import { randomUUID } from 'node:crypto'
import AppSettings from '../settings'
import { logger, runInContext } from '../lib/logger'

const { config } = AppSettings

export function httpLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now()
    const requestId = c.get('requestId')
    const traceId = typeof requestId === 'string' && requestId.length > 0 ? requestId : randomUUID()

    return runInContext(traceId, async () => {
      const scoped = logger.child({})
      c.set('logger', scoped)
      c.set('traceId', traceId)

      await next()

      const url = c.req.path
      const method = c.req.method
      const status = c.res.status
      const duration = Date.now() - start

      const ignore = config.log.autoLoggingIgnorePaths.some(path => url.startsWith(path))
      if (!ignore) {
        const user = c.get('user')
        scoped.info({ method, url, status, duration, user: {
          name: user?.username,
          role: user?.role || 'guest',
        } }, 'request completed')
      }
    })
  }
}
