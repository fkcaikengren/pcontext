import type { ApiSuccess } from './types'
import { Hono } from 'hono'
import { initSettings } from '@/modules/doc/infrastructure/agent/settings'
import { initEnforcer } from '@/modules/user/infrastructure/casbin/enforcer'
import createApp from '@/shared/create-app'
import { bootstrap } from '@/shared/db/bootstrap'
import { initDb } from '@/shared/db/connection'
import docs from './modules/doc/doc.route'
import tasks from './modules/task/task.route'
import users from './modules/user/user.route'
import AppSettings from './settings'

const { config } = AppSettings

const health = new Hono().get('/', (c) => {
  return c.json({
    code: 200,
    message: 'ok',
  } as ApiSuccess)
})

const api = new Hono()
  .route('/health', health)
  .route('/users', users)
  .route('/docs', docs)
  // .route('/chat', chat) //TODO: 移除chat?
  .route('/tasks', tasks)

export const app = createApp().route(config.api_prefix, api)
export type AppType = typeof api // 是 api 作为app type

await initDb()
await bootstrap()
await initEnforcer()
initSettings()

export default {
  port: AppSettings.config.port,
  fetch: app.fetch,
  idleTimeout: 60,
}
