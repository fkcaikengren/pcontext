import { sql } from 'drizzle-orm'
import { bigint, index as pgIndex, pgTable, serial, varchar } from 'drizzle-orm/pg-core'
import { index as sqliteIndex, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const taskPg = pgTable('task', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 64 }).notNull(),
  resourceId: varchar('resource_id', { length: 256 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('running'),
  message: varchar('message', { length: 1024 }),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
}, t => ({
  resourceIdIdx: pgIndex('task_resource_id_idx').on(t.resourceId),
  typeResourceIdIdx: pgIndex('task_type_resource_id_idx').on(t.type, t.resourceId),
}))

export type TaskPgPO = typeof taskPg.$inferSelect
export type InsertTaskPgPO = typeof taskPg.$inferInsert

export const taskSqlite = sqliteTable('task', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  resourceId: text('resource_id').notNull(),
  status: text('status').notNull().default('running'),
  message: text('message'),
  createdAt: integer('created_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
  updatedAt: integer('updated_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
}, t => ({
  resourceIdIdx: sqliteIndex('task_resource_id_idx').on(t.resourceId),
  typeResourceIdIdx: sqliteIndex('task_type_resource_id_idx').on(t.type, t.resourceId),
}))

export type TaskSqlitePO = typeof taskSqlite.$inferSelect
export type InsertTaskSqlitePO = typeof taskSqlite.$inferInsert

export const pg = {
  task: taskPg,
}

export const sqlite = {
  task: taskSqlite,
}
