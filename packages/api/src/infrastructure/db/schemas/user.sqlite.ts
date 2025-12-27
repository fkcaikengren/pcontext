import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('user'),
  status: text('status').notNull().default('active'),
  createdAt: integer('created_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
  updatedAt: integer('updated_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
})
