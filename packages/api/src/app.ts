import type { ApiSuccess } from './shared/types'
import { Hono } from 'hono'
import { initSettings as initAgentSettings } from '@/modules/doc/infrastructure/agent/settings'

import { initEnforcer } from '@/modules/user/infrastructure/casbin/enforcer'
import createApp from '@/shared/create-app'
import { bootstrap } from '@/shared/db/bootstrap'
import { initDb } from '@/shared/db/connection'
import { initRedis } from '@/shared/redis'
import chat from './modules/doc/chat.route'
import docs, { llmTxtHandler } from './modules/doc/doc.route'
import mcp from './modules/doc/mcp.route'
import ranking from './modules/rank/rank.route'
import tasks from './modules/task/task.route'
import users from './modules/user/interfaces/user.route'
import AppSettings from './settings'

const health = new Hono().get('/', (c) => {
  return c.json({
    code: 200,
    message: 'ok',
    data: {
      version: AppSettings.global.version,
    },
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

// TODO: 优化路由设计（这里 暂时dev下 导致llm.txt 路由无法正常工作 可以考虑开发时转到3000端口）
// /docs/:docSlug/llm.txt 路由 - 获取文档的 LLM 格式内容
app.get('/docs/:slug/llm.txt', llmTxtHandler)

export type AppType = typeof api // 是 api 作为app type

export async function initApp() {
  await initDb()
  await initRedis()
  await bootstrap()
  await initEnforcer()
  initAgentSettings()
}
