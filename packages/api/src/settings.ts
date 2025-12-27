import type { PContextConfig } from '@pcontext/shared'
import { getDirname, loadPContextConfig } from '@pcontext/shared'
import path from 'node:path'


interface GlobalAppSettings {
  config: PContextConfig
  global: Record<string, any>
}

let config = await loadPContextConfig()

if (process.env.NODE_ENV === 'development') {
  const __dirname = getDirname(import.meta.url)
  const configPath = path.join(__dirname, '../../../pcontext.config.local.js')
  config = await loadPContextConfig(configPath)
  console.log(`load pcontext config from ${configPath}`)
}

const AppSettings: GlobalAppSettings = {
  config: config,
  global: {},
}

export default AppSettings
