import type { IUserRepository } from '@/modules/user/user.repo.interface'
import type { IDocRepository } from '@/modules/doc/doc.repo.interface'
import type { ITaskRepository } from '@/modules/task/task.repo.interface'
import { PgUserRepository } from '@/modules/user/infrastructure/user.repo.pg'
import { SqliteUserRepository } from '@/modules/user/infrastructure/user.repo.sqlite'
import { PgDocRepository } from '@/modules/doc/infrastructure/doc.repo.pg'
import { SqliteDocRepository } from '@/modules/doc/infrastructure/doc.repo.sqlite'
import { PgTaskRepository } from '@/modules/task/infrastructure/task.repo.pg'
import { SqliteTaskRepository } from '@/modules/task/infrastructure/task.repo.sqlite'
import { getDbProvider, getPgDb, getSqliteDb } from '@/shared/db/connection'
import { userPg, userSqlite } from '@/modules/user/infrastructure/user.po'

export type DatabaseProvider = 'postgresql' | 'sqlite'

export type RepoDeps = {
  provider: DatabaseProvider
  userRepo: IUserRepository
  docRepo: IDocRepository
  taskRepo: ITaskRepository
  ping: () => Promise<boolean>
}

let repoDeps: RepoDeps | null = null

export function getRepoDeps(): RepoDeps {
  if (repoDeps) return repoDeps

  const provider = getDbProvider()

  if (provider === 'postgresql') {
    const db = getPgDb()
    const userRepo = new PgUserRepository(db)
    const docRepo = new PgDocRepository(db)
    const taskRepo = new PgTaskRepository(db)

    repoDeps = {
      provider,
      userRepo,
      docRepo,
      taskRepo,
      async ping() {
        try {
          await db.select().from(userPg).limit(1)
          return true
        } catch {
          return false
        }
      },
    }

    return repoDeps
  }

  const db = getSqliteDb()
  const userRepo = new SqliteUserRepository(db)
  const docRepo = new SqliteDocRepository(db)
  const taskRepo = new SqliteTaskRepository(db)

  repoDeps = {
    provider,
    userRepo,
    docRepo,
    taskRepo,
    async ping() {
      try {
        await db.select().from(userSqlite).limit(1)
        return true
      } catch {
        return false
      }
    },
  }

  return repoDeps
}
