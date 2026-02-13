import { sql } from 'drizzle-orm'
import { bigint, integer as pgInteger, pgEnum, pgTable, serial, varchar } from 'drizzle-orm/pg-core'
import { integer as sqliteInteger, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { userPg, userSqlite } from '@/modules/user/infrastructure/user.po'

export const docSourceEnum = pgEnum('doc_source', ['git', 'website'])

export const docPg = pgTable('doc', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 256 }).notNull().unique(),
  name: varchar('name', { length: 256 }).notNull(),
  source: docSourceEnum('source').notNull(),
  url: varchar('url', { length: 1024 }).notNull(),
  accessCount: pgInteger('access_count').notNull().default(0),
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
  id: sqliteInteger('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  source: text('source').notNull(),
  url: text('url').notNull(),
  accessCount: sqliteInteger('access_count').notNull().default(0),
  createdAt: sqliteInteger('created_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
  updatedAt: sqliteInteger('updated_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
})

export const favoriteSqlite = sqliteTable('favorite', {
  id: sqliteInteger('id').primaryKey({ autoIncrement: true }),
  userId: sqliteInteger('user_id').notNull().references(() => userSqlite.id),
  docId: sqliteInteger('doc_id').notNull().references(() => docSqlite.id),
  createdAt: sqliteInteger('created_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
})

export type DocSqlitePO = typeof docSqlite.$inferSelect
export type InsertDocSqlitePO = typeof docSqlite.$inferInsert
export type FavoriteSqlitePO = typeof favoriteSqlite.$inferSelect
export type InsertFavoriteSqlitePO = typeof favoriteSqlite.$inferInsert

