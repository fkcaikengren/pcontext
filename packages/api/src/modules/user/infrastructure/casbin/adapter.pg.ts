import type { Model, UpdatableAdapter } from 'casbin'
import { Helper } from 'casbin'
import { and, eq } from 'drizzle-orm'
import type { PostgresqlDB } from '@/shared/db/connection'
import { casbinRulePg } from '@/modules/user/infrastructure/casbin-rule.po'

type Row = typeof casbinRulePg.$inferSelect
type Create = typeof casbinRulePg.$inferInsert

function toPolicyLine(line: Row, model: Model) {
  const text = (line.ptype || '') + ', ' + [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5].filter(Boolean).join(', ')
  Helper.loadPolicyLine(text, model)
}

function buildConditions(line: Partial<Create>) {
  const conds: any[] = []
  if (line.ptype) conds.push(eq(casbinRulePg.ptype, line.ptype))
  if (line.v0 !== undefined) conds.push(eq(casbinRulePg.v0, line.v0 as string))
  if (line.v1 !== undefined) conds.push(eq(casbinRulePg.v1, line.v1 as string))
  if (line.v2 !== undefined) conds.push(eq(casbinRulePg.v2, line.v2 as string))
  if (line.v3 !== undefined) conds.push(eq(casbinRulePg.v3, line.v3 as string))
  if (line.v4 !== undefined) conds.push(eq(casbinRulePg.v4, line.v4 as string))
  if (line.v5 !== undefined) conds.push(eq(casbinRulePg.v5, line.v5 as string))
  return conds.length ? and(...conds) : undefined
}

function savePolicyLine(ptype: string, rule: string[]): Create {
  const line: Create = { ptype }
  if (rule.length > 0) line.v0 = rule[0]
  if (rule.length > 1) line.v1 = rule[1]
  if (rule.length > 2) line.v2 = rule[2]
  if (rule.length > 3) line.v3 = rule[3]
  if (rule.length > 4) line.v4 = rule[4]
  if (rule.length > 5) line.v5 = rule[5]
  return line
}

export class PgCasbinAdapter implements UpdatableAdapter {
  constructor(private db: PostgresqlDB) {}

  async loadPolicy(model: Model): Promise<void> {
    const rows = await this.db.select().from(casbinRulePg)
    for (const r of rows) toPolicyLine(r, model)
  }

  async savePolicy(model: Model): Promise<boolean> {
    await this.db.delete(casbinRulePg)
    let astMap = model.model.get('p')!
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = savePolicyLine(ptype, rule)
        await this.db.insert(casbinRulePg).values(line)
      }
    }
    astMap = model.model.get('g')!
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = savePolicyLine(ptype, rule)
        await this.db.insert(casbinRulePg).values(line)
      }
    }
    return true
  }

  async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    const line = savePolicyLine(ptype, rule)
    await this.db.insert(casbinRulePg).values(line)
  }

  async removePolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    const where = buildConditions(savePolicyLine(ptype, rule))
    if (where) await this.db.delete(casbinRulePg).where(where)
  }

  async removeFilteredPolicy(_sec: string, ptype: string, fieldIndex: number, ...fieldValues: string[]): Promise<void> {
    const line: Partial<Create> = { ptype }
    const idx = fieldIndex + fieldValues.length
    if (fieldIndex <= 0 && 0 < idx) line.v0 = fieldValues[0 - fieldIndex]
    if (fieldIndex <= 1 && 1 < idx) line.v1 = fieldValues[1 - fieldIndex]
    if (fieldIndex <= 2 && 2 < idx) line.v2 = fieldValues[2 - fieldIndex]
    if (fieldIndex <= 3 && 3 < idx) line.v3 = fieldValues[3 - fieldIndex]
    if (fieldIndex <= 4 && 4 < idx) line.v4 = fieldValues[4 - fieldIndex]
    if (fieldIndex <= 5 && 5 < idx) line.v5 = fieldValues[5 - fieldIndex]
    const where = buildConditions(line)
    if (where) await this.db.delete(casbinRulePg).where(where)
  }

  async updatePolicy(_sec: string, ptype: string, oldRule: string[], newRule: string[]): Promise<void> {
    const where = buildConditions(savePolicyLine(ptype, oldRule))
    const next = savePolicyLine(ptype, newRule)
    if (where) await this.db.update(casbinRulePg).set(next).where(where)
  }

  async updatePolicies(_sec: string, ptype: string, oldRules: string[][], newRules: string[][]): Promise<void> {
    if (oldRules.length !== newRules.length) {
      throw new Error('oldRules and newRules must have the same length')
    }

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < oldRules.length; i++) {
        const where = buildConditions(savePolicyLine(ptype, oldRules[i]))
        const next = savePolicyLine(ptype, newRules[i])
        if (where) {
          await tx.update(casbinRulePg).set(next).where(where)
        }
      }
    })
  }

  async updateFilteredPolicies(_sec: string, ptype: string, newRules: string[][], fieldIndex: number, ...fieldValues: string[]): Promise<string[][]> {
    const line: Partial<Create> = { ptype }
    const idx = fieldIndex + fieldValues.length
    if (fieldIndex <= 0 && 0 < idx) line.v0 = fieldValues[0 - fieldIndex]
    if (fieldIndex <= 1 && 1 < idx) line.v1 = fieldValues[1 - fieldIndex]
    if (fieldIndex <= 2 && 2 < idx) line.v2 = fieldValues[2 - fieldIndex]
    if (fieldIndex <= 3 && 3 < idx) line.v3 = fieldValues[3 - fieldIndex]
    if (fieldIndex <= 4 && 4 < idx) line.v4 = fieldValues[4 - fieldIndex]
    if (fieldIndex <= 5 && 5 < idx) line.v5 = fieldValues[5 - fieldIndex]
    const where = buildConditions(line)

    if (!where) return []

    const oldRows = await this.db.select().from(casbinRulePg).where(where)
    const oldRules: string[][] = oldRows.map((r) => {
      const rule: string[] = []
      if (r.v0 != null) rule.push(r.v0)
      if (r.v1 != null) rule.push(r.v1)
      if (r.v2 != null) rule.push(r.v2)
      if (r.v3 != null) rule.push(r.v3)
      if (r.v4 != null) rule.push(r.v4)
      if (r.v5 != null) rule.push(r.v5)
      return rule
    })

    await this.db.transaction(async (tx) => {
      await tx.delete(casbinRulePg).where(where)
      for (const rule of newRules) {
        const next = savePolicyLine(ptype, rule)
        await tx.insert(casbinRulePg).values(next)
      }
    })

    return oldRules
  }
}
