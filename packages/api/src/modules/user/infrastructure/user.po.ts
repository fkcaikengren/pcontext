


import { sql } from 'drizzle-orm'
import { bigint, pgEnum, pgTable, serial, varchar } from 'drizzle-orm/pg-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'


export const userRoleEnum = pgEnum('user_role', ['admin', 'user'])

export const userPg = pgTable('user', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 64 }).notNull().unique(),
  password: varchar('password', { length: 128 }).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  phone: varchar('phone', { length: 32 }).notNull().unique(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  role: userRoleEnum('role').notNull().default('user'),
  status: varchar('status', { length: 16 }).notNull().default('active'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
})

export type UserPgPO = typeof userPg.$inferSelect
export type InsertUserPgPO = typeof userPg.$inferInsert



export const userSqlite = sqliteTable('user', {
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

export type UserSqlitePO = typeof userSqlite.$inferSelect
export type InsertUserSqlitePO = typeof userSqlite.$inferInsert
