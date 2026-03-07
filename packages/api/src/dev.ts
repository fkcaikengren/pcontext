// import { initSettings as initAgentSettings } from '@/modules/doc/infrastructure/agent/settings'
// import { initEnforcer } from '@/modules/user/infrastructure/casbin/enforcer'
// import { bootstrap } from '@/shared/db/bootstrap'
// import { initDb } from '@/shared/db/connection'
import { app, initApp } from './app'
import AppSettings, { loadSettingsConfig } from './settings'

await loadSettingsConfig('../../../pcontext.config.local.js')
await initApp()

export default {
  port: AppSettings.config.port,
  fetch: app.fetch,
  idleTimeout: 255, // Bun 支持的最大空闲超时（约4.25分钟），防止流式响应被过早关闭
  development: false, // 在流式路由中关闭热重载的副作用
}
