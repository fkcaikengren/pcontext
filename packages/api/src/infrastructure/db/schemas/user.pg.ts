import { sql } from 'drizzle-orm'
import { bigint, pgEnum, pgTable, serial, varchar } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['admin', 'user'])

export const user = pgTable('user', {
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
