import AppSettings from './settings'
import createApp from './lib/create-app'
import index from './routes/index.route'
import health from './routes/health.route'
import users from './routes/user.route'
import docs from './routes/doc.route'
import chat from './routes/chat.route'
import tasks from './routes/task.route'
import { initEnforcer } from '@/infrastructure/casbin/enforcer'
import { initDb } from '@/infrastructure/db/connection'
import { bootstrap } from '@/infrastructure/db/bootstrap'
import { initSettings } from './infrastructure/agent/settings'
import { Hono } from 'hono'

const { config } = AppSettings


const api = new Hono()
  .route('/', index)
  .route('/health', health)
  .route('/users', users)
  .route('/docs', docs)
  .route('/chat', chat)
  .route('/tasks', tasks)

const app = createApp().route(config.api_prefix, api)

await initDb()
await bootstrap()
await initEnforcer()
initSettings()


export default {
  port: AppSettings.config.port,
  fetch: app.fetch,
  idleTimeout: 60
}
