import { sql } from 'drizzle-orm'
import { bigint, bigserial, jsonb, index as pgIndex, integer as pgInteger, pgTable, text as pgText, uniqueIndex as pgUniqueIndex, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { integer, index as sqliteIndex, sqliteTable, uniqueIndex as sqliteUniqueIndex, text } from 'drizzle-orm/sqlite-core'

export const taskPg = pgTable('task', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
  type: varchar('type', { length: 64 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('running'),
  message: varchar('message', { length: 1024 }),
  extraData: jsonb('extra_data'),
  logsLength: pgInteger('logs_length').notNull().default(0),
  createdAt: bigint('created_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().default(sql`EXTRACT(EPOCH FROM NOW()) * 1000`),
}, _t => ({
  // resourceIdIdx: pgIndex('task_resource_id_idx').on(_t.resourceId),
  // typeResourceIdIdx: pgIndex('task_type_resource_id_idx').on(_t.type, _t.resourceId),
}))

export type TaskPgPO = typeof taskPg.$inferSelect
export type InsertTaskPgPO = typeof taskPg.$inferInsert

export const taskLogPg = pgTable('task_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  taskId: uuid('task_id').notNull(),
  logLevel: varchar('log_level', { length: 10 }),
  content: pgText('content'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow(),
  extraData: jsonb('extra_data'),
  traceId: varchar('trace_id', { length: 64 }),
}, t => ({
  idxTaskIdTime: pgIndex('idx_task_id_time').on(t.taskId, t.createdAt),
  uniqueTaskTimeContent: pgUniqueIndex('unique_task_time_content').on(t.taskId, t.createdAt, t.content),
}))

export type TaskLogPgPO = typeof taskLogPg.$inferSelect
export type InsertTaskLogPgPO = typeof taskLogPg.$inferInsert

export const taskSqlite = sqliteTable('task', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  status: text('status').notNull().default('running'),
  message: text('message'),
  extraData: text('extra_data', { mode: 'json' }),
  logsLength: integer('logs_length').notNull().default(0),
  createdAt: integer('created_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
  updatedAt: integer('updated_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
}, _t => ({
  // resourceIdIdx: sqliteIndex('task_resource_id_idx').on(_t.resourceId),
  // typeResourceIdIdx: sqliteIndex('task_type_resource_id_idx').on(_t.type, _t.resourceId),
}))

export type TaskSqlitePO = typeof taskSqlite.$inferSelect
export type InsertTaskSqlitePO = typeof taskSqlite.$inferInsert

export const taskLogSqlite = sqliteTable('task_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: text('task_id').notNull(),
  logLevel: text('log_level'),
  content: text('content'),
  createdAt: integer('created_at').notNull().default(sql`(strftime('%s','now') * 1000)`),
  extraData: text('extra_data', { mode: 'json' }),
  traceId: text('trace_id'),
}, t => ({
  idxTaskIdTime: sqliteIndex('idx_task_id_time').on(t.taskId, t.createdAt),
  uniqueTaskTimeContent: sqliteUniqueIndex('unique_task_time_content').on(t.taskId, t.createdAt, t.content),
}))

export type TaskLogSqlitePO = typeof taskLogSqlite.$inferSelect
export type InsertTaskLogSqlitePO = typeof taskLogSqlite.$inferInsert

export const pg = {
  task: taskPg,
  taskLog: taskLogPg,
}

export const sqlite = {
  task: taskSqlite,
  taskLog: taskLogSqlite,
}
