import { Pool } from 'pg'
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { createClient } from '@libsql/client'
import { drizzle as drizzleSqlite } from 'drizzle-orm/libsql/node'
import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core'
import { userPg, userSqlite } from '@/modules/user/infrastructure/user.po'
import { docPg, docSqlite, favoritePg, favoriteSqlite } from '@/modules/doc/infrastructure/doc.po'
import { casbinRulePg, casbinRuleSqlite } from '@/modules/user/infrastructure/casbin-rule.po'
import { taskPg, taskSqlite } from '@/modules/task/infrastructure/task.po'
import AppSettings from '@/settings'

const pgSchema = { user: userPg, doc: docPg, favorite: favoritePg, casbinRule: casbinRulePg, task: taskPg }
const sqliteSchema = { user: userSqlite, doc: docSqlite, favorite: favoriteSqlite, casbinRule: casbinRuleSqlite, task: taskSqlite }

const { config } = AppSettings

let provider: 'postgresql' | 'sqlite' | null = null
let pgDb: NodePgDatabase<typeof pgSchema> | null = null
let sqliteDb: LibSQLDatabase<typeof sqliteSchema> | null = null
let initialized = false

export type PostgresqlDB = NodePgDatabase<typeof pgSchema>
export type SqliteDB = LibSQLDatabase<typeof sqliteSchema>

export async function initDb() {
  if (initialized) return
  provider = config.database.provider
  const dbUrl = config.database.url
  if (provider === 'postgresql') {
    const pgPool = new Pool({ connectionString: dbUrl })
    pgDb = drizzlePg(pgPool, { schema: pgSchema })
  }
  else {
    const sqliteClient = createClient({ url: dbUrl })
    sqliteDb = drizzleSqlite(sqliteClient, { schema: sqliteSchema })
  }
  initialized = true
}

function ensureInitialized() {
  if (!initialized) {
    throw new Error('Database not initialized, call initDb() at startup')
  }
}

export function getDbProvider(): 'postgresql' | 'sqlite' {
  ensureInitialized()
  return provider as 'postgresql' | 'sqlite'
}

export function getPgDb(): PostgresqlDB {
  ensureInitialized()
  if (!pgDb) {
    throw new Error('PostgreSQL database not configured')
  }
  return pgDb
}

export function getSqliteDb(): SqliteDB {
  ensureInitialized()
  if (!sqliteDb) {
    throw new Error('SQLite database not configured')
  }
  return sqliteDb
}
