import type { AppBindings } from '@/shared/types'
import { Cron } from 'croner'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { notFound, serveEmojiFavicon } from 'stoker/middlewares'
import { authorization } from '@/shared/middleware/authorization'
import { httpLogger } from '@/shared/middleware/http-logger'
import { jwt } from '@/shared/middleware/jwt'
import AppSettings from '@/settings'
import { errorHandler } from '@/shared/utils/errorHandler'

const { config } = AppSettings

export function createRouter(limit: number = config.rate_limit_max) {
  return new Hono<AppBindings>()
}

export function createCron() {
  return new Cron('0 */5 * * * *', () => {})
}

export default function createApp() {
  const app = createRouter().use(`${config.api_prefix}/*`, requestId())
    .use(`${config.api_prefix}/*`, httpLogger())
    .use(`${config.api_prefix}/*`, serveEmojiFavicon('🔥'))
    .use(`${config.api_prefix}/*`, cors({
      origin: 'http://localhost:3001',
      allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      allowMethods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
      credentials: true,
    }))
    .use(`${config.api_prefix}/*`, jwt())
    .use(`${config.api_prefix}/*`, authorization({}))

  app.notFound(notFound)
  app.onError(errorHandler)

  createCron()

  return app
}
