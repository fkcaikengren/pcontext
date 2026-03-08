import { createClient } from '@libsql/client'

// 数据库配置
const DB_PATH = './app-info.db'
const client = createClient({
  url: `file:${DB_PATH}`,
})

// 初始化数据库表
export async function initAppInfoDB(): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)
}

// 获取版本信息
export async function getVersion(): Promise<string | null> {
  const result = await client.execute({
    sql: 'SELECT value FROM app_meta WHERE key = ?',
    args: ['version'],
  })
  return result.rows[0]?.value as string | null
}

// 设置版本信息（覆盖式）
export async function setVersion(version: string): Promise<void> {
  await client.execute({
    sql: 'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: ['version', version],
  })
}

// 关闭数据库连接
export async function closeDatabase(): Promise<void> {
  await client.close()
}
