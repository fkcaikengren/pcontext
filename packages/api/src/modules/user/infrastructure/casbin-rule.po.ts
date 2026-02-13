import { pgTable, serial, varchar } from 'drizzle-orm/pg-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const casbinRulePg = pgTable('casbin_rule', {
  id: serial('id').primaryKey().notNull(),
  ptype: varchar('ptype', { length: 254 }),
  v0: varchar('v0', { length: 254 }),
  v1: varchar('v1', { length: 254 }),
  v2: varchar('v2', { length: 254 }),
  v3: varchar('v3', { length: 254 }),
  v4: varchar('v4', { length: 254 }),
  v5: varchar('v5', { length: 254 }),
})

export type CasbinRulePgPO = typeof casbinRulePg.$inferSelect
export type InsertCasbinRulePgPO = typeof casbinRulePg.$inferInsert

export const casbinRuleSqlite = sqliteTable('casbin_rule', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  ptype: text('ptype'),
  v0: text('v0'),
  v1: text('v1'),
  v2: text('v2'),
  v3: text('v3'),
  v4: text('v4'),
  v5: text('v5'),
})

export type CasbinRuleSqlitePO = typeof casbinRuleSqlite.$inferSelect
export type InsertCasbinRuleSqlitePO = typeof casbinRuleSqlite.$inferInsert

export const pg = {
  casbinRule: casbinRulePg,
}

export const sqlite = {
  casbinRule: casbinRuleSqlite,
}
