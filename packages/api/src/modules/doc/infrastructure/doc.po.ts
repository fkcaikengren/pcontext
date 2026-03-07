import { sql } from 'drizzle-orm'
import { bigint, pgEnum, integer as pgInteger, pgTable, serial, uuid, varchar } from 'drizzle-orm/pg-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { taskPg, taskSqlite } from '@/modules/task/infrastructure/task.po'
import { userPg, userSqlite } from '@/modules/user/infrastructure/user.po'

export const docSourceEnum = pgEnum('doc_source', ['github', 'gitee', 'website'])

export const docPg = pgTable('doc', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 256 }).notNull().unique(),
  name: varchar('name', { length: 256 }).notNull(),
  source: docSourceEnum('source').notNull(),
  url: varchar('url', { length: 1024 }).notNull(),
  taskId: uuid('task_id').references(() => taskPg.id),
  accessCount: pgInteger('access_count').notNull().default(0),
  tokens: pgInteger('tokens').notNull().default(0),
  snippets: pgInteger('snippets').notNull().default(0),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
})

export const favoritePg = pgTable('favorite', {
  id: serial('id').primaryKey(),
  userId: pgInteger('user_id').notNull().references(() => userPg.id),
  docId: pgInteger('doc_id').notNull().references(() => docPg.id),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
})

export type DocPgPO = typeof docPg.$inferSelect
export type InsertDocPgPO = typeof docPg.$inferInsert
export type FavoritePgPO = typeof favoritePg.$inferSelect
export type InsertFavoritePgPO = typeof favoritePg.$inferInsert

export const docSqlite = sqliteTable('doc', {
  id: integer('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  source: text('source').notNull(),
  url: text('url').notNull(),
  taskId: text('task_id').references(() => taskSqlite.id),
  accessCount: integer('access_count').notNull().default(0),
  tokens: integer('tokens').notNull().default(0),
  snippets: integer('snippets').notNull().default(0),
  createdAt: integer('created_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
  updatedAt: integer('updated_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
})

export const favoriteSqlite = sqliteTable('favorite', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => userSqlite.id),
  docId: integer('doc_id').notNull().references(() => docSqlite.id),
  createdAt: integer('created_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
})

export type DocSqlitePO = typeof docSqlite.$inferSelect
export type InsertDocSqlitePO = typeof docSqlite.$inferInsert
export type FavoriteSqlitePO = typeof favoriteSqlite.$inferSelect
export type InsertFavoriteSqlitePO = typeof favoriteSqlite.$inferInsert
