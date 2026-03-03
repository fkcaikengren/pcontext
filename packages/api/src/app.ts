import type { ApiSuccess } from './shared/types'
import { Hono } from 'hono'

import { initSettings as initAgentSettings } from '@/modules/doc/infrastructure/agent/settings'
import { initEnforcer } from '@/modules/user/infrastructure/casbin/enforcer'
import createApp from '@/shared/create-app'
import { bootstrap } from '@/shared/db/bootstrap'
import { initDb } from '@/shared/db/connection'
import { initRedis } from '@/shared/redis'
import chat from './modules/doc/chat.route'
import docs from './modules/doc/doc.route'
import mcp from './modules/doc/mcp.route'
import ranking from './modules/rank/rank.route'
import tasks from './modules/task/task.route'
import users from './modules/user/interfaces/user.route'

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
  .route('/chat', chat)
  .route('/ranking', ranking)
  .route('/tasks', tasks)

export const app = createApp()
  .route('/mcp', mcp)
  .route('/api', api)

export type AppType = typeof api // 是 api 作为app type

export async function initApp() {
  await initDb()
  await initRedis()
  await bootstrap()
  await initEnforcer()
  initAgentSettings()
}
