import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './user.sqlite'

export const doc = sqliteTable('doc', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  source: text('source').notNull(),
  url: text('url').notNull(),
  accessCount: integer('access_count').notNull().default(0),
  createdAt: integer('created_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
  updatedAt: integer('updated_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
})

export const favorite = sqliteTable('favorite', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => user.id),
  docId: integer('doc_id').notNull().references(() => doc.id),
  createdAt: integer('created_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
})
