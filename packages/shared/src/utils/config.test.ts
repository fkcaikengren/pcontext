
import { loadPContextConfig } from './config'
import { resolve } from 'node:path'
import { writeFileSync, unlinkSync } from 'node:fs'
import { getDirname } from './env'

const __dirname = getDirname(import.meta.url)

describe('loadPContextConfig', () => {
  const tempJsonConfigPath = resolve(__dirname, 'temp.config.json')
  const tempJsConfigPath = resolve(__dirname, 'temp.config.js')

  afterEach(() => {
    try {
      unlinkSync(tempJsonConfigPath)
    } catch (e) {}
    try {
      unlinkSync(tempJsConfigPath)
    } catch (e) {}
  })

  it('should load default config if file is empty JSON', async () => {
    writeFileSync(tempJsonConfigPath, '{}')
    const config = await loadPContextConfig(tempJsonConfigPath)
    expect(config.port).toBe(3000)
    expect(config.api_prefix).toBe('/api')
    expect(config.log.level).toBe('info')
  })

  it('should override defaults with user config', async () => {
    const userConfig = {
      port: 8080,
      api_prefix: '/v1',
      log: {
        level: 'debug',
      },
    }
    writeFileSync(tempJsonConfigPath, JSON.stringify(userConfig))
    const config = await loadPContextConfig(tempJsonConfigPath)
    expect(config.port).toBe(8080)
    expect(config.api_prefix).toBe('/v1')
    expect(config.log.level).toBe('debug')
  })

  it('should throw error if config file does not exist', async () => {
    await expect(loadPContextConfig('non-existent-file.json')).rejects.toThrow(/配置文件不存在/)
  })

  it('should throw error if config file is invalid JSON', async () => {
    writeFileSync(tempJsonConfigPath, 'invalid-json')
    await expect(loadPContextConfig(tempJsonConfigPath)).rejects.toThrow(/配置文件读取或解析失败/)
  })

  it('should throw error if config validation fails', async () => {
    const invalidConfig = {
      port: -1,
    }
    writeFileSync(tempJsonConfigPath, JSON.stringify(invalidConfig))
    await expect(loadPContextConfig(tempJsonConfigPath)).rejects.toThrow(/配置文件验证失败/)
  })

  it('should load js config via dynamic import', async () => {
    const jsConfigSource = `export default { port: 3100, api_prefix: '/apis', log: { level: 'warn' } }`
    writeFileSync(tempJsConfigPath, jsConfigSource)
    const config = await loadPContextConfig(tempJsConfigPath)
    expect(config.port).toBe(3100)
    expect(config.api_prefix).toBe('/apis')
    expect(config.log.level).toBe('warn')
  })
})
