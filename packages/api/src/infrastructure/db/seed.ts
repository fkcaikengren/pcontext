import argon2 from 'argon2'
import { logger } from '@/lib/logger'
import { getDbProvider, getPgDb, getSqliteDb } from '@/infrastructure/db/connection'
import { user as sqliteUser } from '@/infrastructure/db/schemas/user.sqlite'
import { user as pgUser } from '@/infrastructure/db/schemas/user.pg'

export async function runSeed(provider?: 'postgresql' | 'sqlite') {
  const currentProvider = provider ?? getDbProvider()
  if (currentProvider === 'sqlite') {
    await seedAdminSqlite()
  } else {
    await seedAdminPostgres()
  }
}

async function seedAdminSqlite() {
  const db = getSqliteDb()
  const adminPassword = await argon2.hash('admin123')

  await db
    .insert(sqliteUser)
    .values({
      username: 'admin',
      password: adminPassword,
      name: 'Admin User',
      phone: '13800000000',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
    })
    .onConflictDoNothing({ target: sqliteUser.username })

  logger.info('Default admin user seeded in SQLite')
}

async function seedAdminPostgres() {
  const db = getPgDb()
  const adminPassword = await argon2.hash('admin123')

  await db
    .insert(pgUser)
    .values({
      username: 'admin',
      password: adminPassword,
      name: 'Admin User',
      phone: '13800000000',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
    })
    .onConflictDoNothing({ target: pgUser.username })

  logger.info('Default admin user seeded in PostgreSQL')
}
