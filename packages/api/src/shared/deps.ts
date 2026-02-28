import type { IDocRepository } from '@/modules/doc/doc.repo.interface'
import type { ITaskRepository } from '@/modules/task/task.repo.interface'
import type { IUserRepository } from '@/modules/user/domain/user.repo.interface'
import { ChatService } from '@/modules/doc/chat.service'
import { PgDocRepository } from '@/modules/doc/infrastructure/doc.repo.pg'
import { SqliteDocRepository } from '@/modules/doc/infrastructure/doc.repo.sqlite'
import { RankService } from '@/modules/rank/rank.service'
import { PgTaskRepository } from '@/modules/task/infrastructure/task.repo.pg'
import { SqliteTaskRepository } from '@/modules/task/infrastructure/task.repo.sqlite'
import { TaskService } from '@/modules/task/task.service'
import { userPg, userSqlite } from '@/modules/user/infrastructure/user.po'
import { PgUserRepository } from '@/modules/user/infrastructure/user.repo.pg'
import { SqliteUserRepository } from '@/modules/user/infrastructure/user.repo.sqlite'
import { getDbProvider, getPgDb, getSqliteDb } from '@/shared/db/connection'

export type DatabaseProvider = 'postgresql' | 'sqlite'

export interface RepoDeps {
  provider: DatabaseProvider
  userRepo: IUserRepository
  docRepo: IDocRepository
  taskRepo: ITaskRepository
  ping: () => Promise<boolean>
}

export interface ServiceDeps {
  taskService: TaskService
  rankService: RankService
  chatService: ChatService
}

let repoDeps: RepoDeps | null = null

let serviceDeps: ServiceDeps | null = null

export function getRepoDeps(): RepoDeps {
  if (repoDeps)
    return repoDeps

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
        }
        catch {
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
      }
      catch {
        return false
      }
    },
  }

  return repoDeps
}

export function getServiceDeps() {
  if (serviceDeps)
    return serviceDeps

  serviceDeps = {
    taskService: new TaskService(),
    rankService: new RankService(),
    chatService: new ChatService(),
  }

  return serviceDeps
}
