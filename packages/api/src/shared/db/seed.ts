import argon2 from 'argon2'
import { logger } from '@/shared/logger'
import { getDbProvider, getPgDb, getSqliteDb } from '@/shared/db/connection'
import { userPg, userSqlite } from '@/modules/user/infrastructure/user.po'

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
    .insert(userSqlite)
    .values({
      username: 'admin',
      password: adminPassword,
      name: 'Admin User',
      phone: '13800000000',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
    })
    .onConflictDoNothing({ target: userSqlite.username })

  logger.info('Default admin user seeded in SQLite')
}

async function seedAdminPostgres() {
  const db = getPgDb()
  const adminPassword = await argon2.hash('admin123')

  await db
    .insert(userPg)
    .values({
      username: 'admin',
      password: adminPassword,
      name: 'Admin User',
      phone: '13800000000',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
    })
    .onConflictDoNothing({ target: userPg.username })

  logger.info('Default admin user seeded in PostgreSQL')
}
