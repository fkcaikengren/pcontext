import type { AppBindings } from './types'
import { Cron } from 'croner'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { etag } from 'hono/etag'
import { requestId } from 'hono/request-id'
import { notFound, serveEmojiFavicon } from 'stoker/middlewares'
import { limiter } from '../middlewares/limiter'
import { responseWrapper } from '../middlewares/response'
import { authorization } from '../middlewares/authorization'
import { httpLogger } from '../middlewares/http-logger'
import { jwt } from '../middlewares/jwt'
import AppSettings from '../settings'
import { errorHandler } from '../utils/errorHandler'

const { config } = AppSettings

// export const isPublic = (path: string) => {
//   return (
//     path === `${config.api_prefix}/health` ||
//     path.startsWith(`${config.api_prefix}/users/login`)
//   )
// }


export function createRouter(limit: number = config.rate_limit_max) {
  return new Hono<AppBindings>().use(limiter(limit))
}

export function createCron() {
  return new Cron('0 */5 * * * *', () => {})
}

export default function createApp() {
  const app = createRouter()
  app.use(`${config.api_prefix}/*`, requestId())
    .use(`${config.api_prefix}/*`, httpLogger())
    .use(`${config.api_prefix}/*`, serveEmojiFavicon('🔥'))
    .use(`${config.api_prefix}/*`, cors({
      origin: 'http://localhost:3001',
      allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      allowMethods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
      credentials: true,
    }))
    .use(`${config.api_prefix}/*`, jwt())
    .use(`${config.api_prefix}/*`,  authorization())
    .use(`${config.api_prefix}/*`, responseWrapper)


  // app.use(etag()) TODO：自定义etag中间件，过滤sse '/tasks/:id/progress'



  app.notFound(notFound)
  app.onError(errorHandler)

  createCron()

  return app
}
