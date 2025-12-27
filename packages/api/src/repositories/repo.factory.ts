import type { IUserRepository } from './IUserRepository'
import type { IDocRepository } from './IDocRepository'
import { PgUserRepository } from './impl/PgUserRepository'
import { SqliteUserRepository } from './impl/SqliteUserRepository'
import { PgDocRepository } from './impl/PgDocRepository'
import { SqliteDocRepository } from './impl/SqliteDocRepository'
import { getDbProvider, getPgDb, getSqliteDb } from '../infrastructure/db/connection'
import { user as pgUser } from '../infrastructure/db/schemas/user.pg'
import { user as sqliteUser } from '../infrastructure/db/schemas/user.sqlite'

export type DatabaseProvider = 'postgresql' | 'sqlite'

export interface Repositories {
  provider: DatabaseProvider
  userRepo: IUserRepository
  docRepo: IDocRepository
  ping: () => Promise<boolean>
}

let repositories: Repositories | null = null

export function getRepositories(): Repositories {
  if (repositories) return repositories

  const provider = getDbProvider()

  if (provider === 'postgresql') {
    const db = getPgDb()
    const userRepo = new PgUserRepository(db)
    const docRepo = new PgDocRepository(db)

    repositories = {
      provider,
      userRepo,
      docRepo,
      async ping() {
        try {
          await db.select().from(pgUser).limit(1)
          return true
        } catch {
          return false
        }
      },
    }

    return repositories
  }

  const db = getSqliteDb()
  const userRepo = new SqliteUserRepository(db)
  const docRepo = new SqliteDocRepository(db)

  repositories = {
    provider,
    userRepo,
    docRepo,
    async ping() {
      try {
        await db.select().from(sqliteUser).limit(1)
        return true
      } catch {
        return false
      }
    },
  }

  return repositories
}
