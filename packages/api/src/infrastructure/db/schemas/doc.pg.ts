import { sql } from 'drizzle-orm'
import { bigint, pgEnum, pgTable, serial, varchar, integer } from 'drizzle-orm/pg-core'
import { user } from './user.pg'

export const docSourceEnum = pgEnum('doc_source', ['git', 'website'])

export const doc = pgTable('doc', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 256 }).notNull().unique(),
  name: varchar('name', { length: 256 }).notNull(),
  source: docSourceEnum('source').notNull(),
  url: varchar('url', { length: 1024 }).notNull(),
  accessCount: integer('access_count').notNull().default(0),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
})

export const favorite = pgTable('favorite', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => user.id),
  docId: integer('doc_id').notNull().references(() => doc.id),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
})
