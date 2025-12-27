import { Pool } from 'pg'
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { createClient } from '@libsql/client'
import { drizzle as drizzleSqlite } from 'drizzle-orm/libsql/node'
import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core'
import * as pgUserSchema from './schemas/user.pg'
import * as pgDocSchema from './schemas/doc.pg'
import * as pgCasbinSchema from './schemas/casbin.pg'
import * as sqliteUserSchema from './schemas/user.sqlite'
import * as sqliteDocSchema from './schemas/doc.sqlite'
import * as sqliteCasbinSchema from './schemas/casbin.sqlite'
import AppSettings from '@/settings'

const pgSchema = { ...pgUserSchema, ...pgDocSchema, ...pgCasbinSchema }
const sqliteSchema = { ...sqliteUserSchema, ...sqliteDocSchema, ...sqliteCasbinSchema }

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
