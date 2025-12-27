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

const { config } = AppSettings

const app = createApp()

app.route(`${config.api_prefix}/`, index)
app.route(`${config.api_prefix}/health`, health)
app.route(`${config.api_prefix}/users`, users)
app.route(`${config.api_prefix}/docs`, docs)
app.route(`${config.api_prefix}/chat`, chat)
app.route(`${config.api_prefix}/tasks`, tasks)

await initDb()
await bootstrap()
await initEnforcer()
initSettings()

export default {
  port: AppSettings.config.port,
  fetch: app.fetch,
}
