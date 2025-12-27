import { createClient } from '@libsql/client'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import AppSettings from '../src/settings'
import { initDb, getSqliteDb } from '../src/infrastructure/db/connection'
import { SqliteCasbinAdapter } from '../src/infrastructure/casbin/adapter.sqlite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)


describe('Casbin enforcer integration', () => {
  const dbFilePath = resolve(__dirname, 'test.db')
  const dbUrl = `file:${dbFilePath}`

  const client = createClient({ url: dbUrl })

  let enforcer: import('casbin').Enforcer

  beforeAll(async () => {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS casbin_rule (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        ptype TEXT,
        v0 TEXT,
        v1 TEXT,
        v2 TEXT,
        v3 TEXT,
        v4 TEXT,
        v5 TEXT
      )
    `)

    await client.execute('DELETE FROM casbin_rule')

    AppSettings.config.database = {
      provider : 'sqlite',
      url: `file:${dbFilePath}`,
      ssl: false
    }
    AppSettings.global.enforcer = undefined
    await initDb()
    const mod = await import('../src/infrastructure/casbin/enforcer')
    enforcer = await mod.initEnforcer()
  })

  it('should seed default policies into casbin_rule table', async () => {
    const rs = await client.execute(
      'SELECT ptype, v0, v1, v2 FROM casbin_rule ORDER BY id',
    )

    const rows = rs.rows.map(row => [row.ptype, row.v0, row.v1, row.v2])

    expect(rows).toEqual(
      expect.arrayContaining([
        ['p', 'admin', '/api/*', '.*'],
        ['p', 'user', '/api/health', 'GET'],
        ['p', 'user', '/api/users', 'GET'],
        ['p', 'guest', '/api/health', 'GET'],
      ]),
    )
  })

  it('should enforce seeded policies correctly', async () => {
    expect(await enforcer.enforce('admin', '/api/anything', 'GET')).toBe(true)
    expect(await enforcer.enforce('admin', '/api/other/path', 'POST')).toBe(true)

    expect(await enforcer.enforce('user', '/api/health', 'GET')).toBe(true)
    expect(await enforcer.enforce('user', '/api/users', 'GET')).toBe(true)
    expect(await enforcer.enforce('user', '/api/users', 'POST')).toBe(false)

    expect(await enforcer.enforce('guest', '/api/health', 'GET')).toBe(true)
    expect(await enforcer.enforce('guest', '/api/users', 'GET')).toBe(false)
    
    expect(await enforcer.enforce('guest', '/api/users/me', 'GET')).toBe(true)
  })

  it('getEnforcer should return the same instance', async () => {
    const mod = await import('../src/infrastructure/casbin/enforcer')
    const fromGetter = await mod.getEnforcer()
    expect(fromGetter).toBe(enforcer)
  })

  it('adapter updatePolicies should update multiple rules in storage', async () => {
    const db = getSqliteDb()
    const adapter = new SqliteCasbinAdapter(db)

    const oldRules = [
      ['user', '/api/health', 'GET'],
      ['guest', '/api/docs', 'GET'],
    ]
    const newRules = [
      ['user', '/api/health', 'POST'],
      ['guest', '/api/docs', 'POST'],
    ]

    await adapter.updatePolicies('p', 'p', oldRules, newRules)
    await enforcer.loadPolicy()

    const rs = await client.execute(
      'SELECT ptype, v0, v1, v2 FROM casbin_rule WHERE (ptype = ? AND v0 = ? AND v1 = ?) OR (ptype = ? AND v0 = ? AND v1 = ?) ORDER BY id',
      ['p', 'user', '/api/health', 'p', 'guest', '/api/docs'],
    )

    const rows = rs.rows.map(row => [row.ptype, row.v0, row.v1, row.v2])

    expect(rows).toEqual(
      expect.arrayContaining([
        ['p', 'user', '/api/health', 'POST'],
        ['p', 'guest', '/api/docs', 'POST'],
      ]),
    )

    await adapter.updatePolicies('p', 'p', newRules, oldRules)
    await enforcer.loadPolicy()
  })

  it('adapter updateFilteredPolicies should replace filtered rules and return old ones', async () => {
    const db = getSqliteDb()
    const adapter = new SqliteCasbinAdapter(db)

    const replacement = [['guest', '/api/health', 'POST']]

    const oldRules = await adapter.updateFilteredPolicies('p', 'p', replacement, 0, 'guest', '/api/health', 'GET')
    await enforcer.loadPolicy()

    expect(oldRules).toEqual([
      ['guest', '/api/health', 'GET'],
    ])

    const rs = await client.execute(
      'SELECT ptype, v0, v1, v2 FROM casbin_rule WHERE ptype = ? AND v0 = ? AND v1 = ? ORDER BY id',
      ['p', 'guest', '/api/health'],
    )

    const rows = rs.rows.map(row => [row.ptype, row.v0, row.v1, row.v2])

    expect(rows).toEqual([
      ['p', 'guest', '/api/health', 'POST'],
    ])

    await adapter.updateFilteredPolicies('p', 'p', oldRules, 0, 'guest', '/api/health', 'POST')
    await enforcer.loadPolicy()
  })
})
