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
  idleTimeout: 60,
}
