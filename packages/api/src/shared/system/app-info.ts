import { createClient } from '@libsql/client'
import AppSettings from '@/settings'

// 声明构建时注入的变量
declare const __VERSION__: string

// 数据库配置
const DB_PATH = './app-info.db'
const client = createClient({
  url: `file:${DB_PATH}`,
})

// 初始化数据库表
export async function initAppInfoDB(): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_info (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

  const oldVersion = await getVersion()
  const version = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0'
  // 版本信息修改
  await setVersion(version)

  AppSettings.global.isVersionChanged = (version !== oldVersion)
}

// 获取版本信息
export async function getVersion(): Promise<string | null> {
  const result = await client.execute({
    sql: 'SELECT value FROM app_info WHERE key = ?',
    args: ['version'],
  })
  return result.rows[0]?.value as string | null
}

// 设置版本信息（覆盖式）
export async function setVersion(version: string): Promise<void> {
  await client.execute({
    sql: 'INSERT INTO app_info (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: ['version', version],
  })
}

// 关闭数据库连接
export async function closeDatabase(): Promise<void> {
  await client.close()
}
