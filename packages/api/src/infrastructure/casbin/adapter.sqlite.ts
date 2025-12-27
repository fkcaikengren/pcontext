import type { Model, UpdatableAdapter } from 'casbin'
import { Helper } from 'casbin'
import { and, eq, sql } from 'drizzle-orm'
import type { SqliteDB } from '@/infrastructure/db/connection'
import { casbinRule } from '@/infrastructure/db/schemas/casbin.sqlite'

type Row = typeof casbinRule.$inferSelect
type Create = typeof casbinRule.$inferInsert

/**
 * 将数据库行转换为 Casbin 文本策略并载入 Model
 * @param line 表记录（casbin_rule）
 * @param model Casbin 模型（用于加载到内存）
 */
function toPolicyLine(line: Row, model: Model) {
  const text = (line.ptype || '') + ', ' + [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5].filter(Boolean).join(', ')
  Helper.loadPolicyLine(text, model)
}

/**
 * 根据给定的策略字段构建 Drizzle 条件表达式
 * 仅针对存在的字段生成相等匹配，避免 undefined 参与比较
 * @param line 作为过滤条件的字段集合
 * @returns 组合后的条件表达式或 undefined（无条件）
 */
function buildConditions(line: Partial<Create>) {
  const conds: any[] = []
  if (line.ptype) conds.push(eq(casbinRule.ptype, line.ptype))
  if (line.v0 !== undefined) conds.push(eq(casbinRule.v0, line.v0 as string))
  if (line.v1 !== undefined) conds.push(eq(casbinRule.v1, line.v1 as string))
  if (line.v2 !== undefined) conds.push(eq(casbinRule.v2, line.v2 as string))
  if (line.v3 !== undefined) conds.push(eq(casbinRule.v3, line.v3 as string))
  if (line.v4 !== undefined) conds.push(eq(casbinRule.v4, line.v4 as string))
  if (line.v5 !== undefined) conds.push(eq(casbinRule.v5, line.v5 as string))
  return conds.length ? and(...conds) : undefined
}

/**
 * 将 Casbin 的策略数组映射为 casbin_rule 的插入对象
 * @param ptype 策略类型（p 或 g）
 * @param rule 策略值数组（v0..v5）
 * @returns 可用于插入/更新的行对象
 */
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

/**
 * SQLite Casbin 适配器：使用 Drizzle 操作策略存储
 */
export class SqliteCasbinAdapter implements UpdatableAdapter {
  private db: SqliteDB

  constructor(db: SqliteDB) {
    this.db = db
  }

  /**
   * 加载所有策略到 Casbin 模型
   * @param model Casbin 模型
   */
  async loadPolicy(model: Model): Promise<void> {
    const rows = await this.db.select().from(casbinRule)
    for (const r of rows) toPolicyLine(r, model)
  }

  /**
   * 保存当前模型中的 p/g 策略到数据库（先清空再写入）
   * @param model Casbin 模型
   * @returns 是否写入成功
   */
  async savePolicy(model: Model): Promise<boolean> {
    await this.db.delete(casbinRule)
    let astMap = model.model.get('p')!
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = savePolicyLine(ptype, rule)
        await this.db.insert(casbinRule).values(line)
      }
    }
    astMap = model.model.get('g')!
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = savePolicyLine(ptype, rule)
        await this.db.insert(casbinRule).values(line)
      }
    }
    return true
  }

  /**
   * 增加单条策略记录
   * @param sec section（未使用）
   * @param ptype 策略类型
   * @param rule 策略值数组
   */
  async addPolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    const line = savePolicyLine(ptype, rule)
    await this.db.insert(casbinRule).values(line)
  }

  /**
   * 删除与给定策略完全匹配的记录
   * @param sec section（未使用）
   * @param ptype 策略类型
   * @param rule 策略值数组
   */
  async removePolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    const where = buildConditions(savePolicyLine(ptype, rule))
    if (where) await this.db.delete(casbinRule).where(where)
  }

  /**
   * 依据字段过滤批量删除策略
   * @param sec section（未使用）
   * @param ptype 策略类型
   * @param fieldIndex 起始字段索引（0 对应 v0）
   * @param fieldValues 需要匹配的字段值序列
   */
  async removeFilteredPolicy(sec: string, ptype: string, fieldIndex: number, ...fieldValues: string[]): Promise<void> {
    const line: Partial<Create> = { ptype }
    const idx = fieldIndex + fieldValues.length
    if (fieldIndex <= 0 && 0 < idx) line.v0 = fieldValues[0 - fieldIndex]
    if (fieldIndex <= 1 && 1 < idx) line.v1 = fieldValues[1 - fieldIndex]
    if (fieldIndex <= 2 && 2 < idx) line.v2 = fieldValues[2 - fieldIndex]
    if (fieldIndex <= 3 && 3 < idx) line.v3 = fieldValues[3 - fieldIndex]
    if (fieldIndex <= 4 && 4 < idx) line.v4 = fieldValues[4 - fieldIndex]
    if (fieldIndex <= 5 && 5 < idx) line.v5 = fieldValues[5 - fieldIndex]
    const where = buildConditions(line)
    if (where) await this.db.delete(casbinRule).where(where)
  }

  /**
   * 更新策略：以旧策略为条件，写入新策略值
   * @param sec section（未使用）
   * @param ptype 策略类型
   * @param oldRule 旧策略值数组
   * @param newRule 新策略值数组
   */
  async updatePolicy(sec: string, ptype: string, oldRule: string[], newRule: string[]): Promise<void> {
    const where = buildConditions(savePolicyLine(ptype, oldRule))
    const next = savePolicyLine(ptype, newRule)
    if (where) await this.db.update(casbinRule).set(next).where(where)
  }

  async updatePolicies(sec: string, ptype: string, oldRules: string[][], newRules: string[][]): Promise<void> {
    if (oldRules.length !== newRules.length) {
      throw new Error('oldRules and newRules must have the same length')
    }

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < oldRules.length; i++) {
        const where = buildConditions(savePolicyLine(ptype, oldRules[i]))
        const next = savePolicyLine(ptype, newRules[i])
        if (where) {
          await tx.update(casbinRule).set(next).where(where)
        }
      }
    })
  }

  async updateFilteredPolicies(sec: string, ptype: string, newRules: string[][], fieldIndex: number, ...fieldValues: string[]): Promise<string[][]> {
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

    const oldRows = await this.db.select().from(casbinRule).where(where)
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
      await tx.delete(casbinRule).where(where)
      for (const rule of newRules) {
        const next = savePolicyLine(ptype, rule)
        await tx.insert(casbinRule).values(next)
      }
    })

    return oldRules
  }
}
