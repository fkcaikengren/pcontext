import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { migrate as migrateSqlite } from 'drizzle-orm/libsql/migrator'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import { getDbProvider, getPgDb, getSqliteDb } from '@/shared/db/connection'
import { runSeed } from '@/shared/db/seed'
import { logger } from '@/shared/logger'

// 获取当前文件所在目录，实现路径与运行工作目录无关
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsBaseDir = path.join(__dirname, 'migrations')

export async function bootstrap() {
  try {
    const provider = getDbProvider()
    if (provider === 'sqlite') {
      const db = getSqliteDb()
      const hasUserTableBefore = await hasSqliteUserTable()
      logger.info('Running SQLite migrations with Drizzle')
      await migrateSqlite(db, { migrationsFolder: path.join(migrationsBaseDir, 'sqlite') })
      logger.info('SQLite migrations applied')
      if (hasUserTableBefore) {
        logger.info('SQLite user table already exists, skip seeding')
      }
      else {
        await runSeed('sqlite')
      }
    }
    else {
      const db = getPgDb()
      const hasUserTableBefore = await hasPostgresUserTable()
      logger.info('Running PostgreSQL migrations with Drizzle')
      await migratePg(db, { migrationsFolder: path.join(migrationsBaseDir, 'pg') })
      logger.info('PostgreSQL migrations applied')
      if (hasUserTableBefore) {
        logger.info('PostgreSQL user table already exists, skip seeding')
      }
      else {
        await runSeed('postgresql')
      }
    }
  }
  catch (error) {
    logger.error(error, 'Database bootstrap failed')
    process.exit(1)
  }
}

async function hasSqliteUserTable() {
  const db = getSqliteDb()
  const result = await db.run(
    sql`SELECT name FROM sqlite_master WHERE type='table' AND (name='user' OR name='User')`,
  )
  const rows = (result as any).rows ?? result
  return Array.isArray(rows) && rows.length > 0
}

async function hasPostgresUserTable() {
  const db = getPgDb()
  const result = await db.execute(
    sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='user'`,
  )
  const rows = (result as any).rows ?? result
  return Array.isArray(rows) && rows.length > 0
}
