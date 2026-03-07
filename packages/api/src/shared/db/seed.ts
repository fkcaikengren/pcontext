import argon2 from 'argon2'
import { userPg, userSqlite } from '@/modules/user/infrastructure/user.po'
import AppSettings from '@/settings'
import { getDbProvider, getPgDb, getSqliteDb } from '@/shared/db/connection'
import { logger } from '@/shared/logger'

export async function runSeed(provider?: 'postgresql' | 'sqlite') {
  const currentProvider = provider ?? getDbProvider()
  const config = AppSettings.config
  if (currentProvider === 'sqlite') {
    await seedAdminSqlite(config.admin_password)
  }
  else {
    await seedAdminPostgres(config.admin_password)
  }
}

async function seedAdminSqlite(adminPassword: string) {
  const db = getSqliteDb()
  const hashedPassword = await argon2.hash(adminPassword)

  await db
    .insert(userSqlite)
    .values({
      username: 'admin',
      password: hashedPassword,
      name: 'Admin User',
      phone: '13800000000',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
    })
    .onConflictDoNothing({ target: userSqlite.username })

  logger.info('Default admin user seeded in SQLite')
}

async function seedAdminPostgres(adminPassword: string) {
  const db = getPgDb()
  const hashedPassword = await argon2.hash(adminPassword)

  await db
    .insert(userPg)
    .values({
      username: 'admin',
      password: hashedPassword,
      name: 'Admin User',
      phone: '13800000000',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
    })
    .onConflictDoNothing({ target: userPg.username })

  logger.info('Default admin user seeded in PostgreSQL')
}
