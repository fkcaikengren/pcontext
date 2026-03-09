import type { PContextConfig } from '@pcontext/shared/node'
import path from 'node:path'
import { getDefaultPContextConfig, getDirname, loadPContextConfig, PContextConfigSchema } from '@pcontext/shared/node'

import { z } from 'zod'

interface GlobalAppSettings {
  config: PContextConfig
  global: Record<string, any>
}

const AppSettings: GlobalAppSettings = {
  config: getDefaultPContextConfig(),
  global: { },
}

export async function loadSettingsConfig(customConfigPath: string) {
  const __dirname = getDirname(import.meta.url)

  const configPath = path.isAbsolute(customConfigPath)
    ? customConfigPath
    : path.join(__dirname, customConfigPath)

  const cfg = await loadPContextConfig(configPath)

  // Zod 验证，确保安全性
  const parseResult = PContextConfigSchema.safeParse(cfg)
  if (!parseResult.success) {
    const details = z.treeifyError(parseResult.error)
    throw new Error(`loadSettingsConfig 配置加载失败: ${JSON.stringify(details)}`)
  }

  const validatedConfig = parseResult.data
  Object.assign(AppSettings.config, validatedConfig)

  console.log(`load pcontext config from ${configPath}`)
  return AppSettings.config
}

export default AppSettings
