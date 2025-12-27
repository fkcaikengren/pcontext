import AppSettings from './settings'
import createApp from './lib/create-app'
import health from './routes/health.route'
import index from './routes/index.route'
import user from './routes/user.route'
import adminUser from './routes/admin/user.route'
import adminRole from './routes/admin/role.route'
import doc from './routes/doc.route'
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
app.route(`${config.api_prefix}/users`, user)
app.route(`${config.api_prefix}/admin/users`, adminUser)
app.route(`${config.api_prefix}/admin/roles`, adminRole)
app.route(`${config.api_prefix}/docs`, doc)
app.route(`${config.api_prefix}/chat`, chat)
app.route(`${config.api_prefix}/tasks`, tasks)

await initDb()
await bootstrap()
await initEnforcer()
initSettings()


export default {
  port: AppSettings.config.port,
  fetch: app.fetch,
  idleTimeout: 60
}
