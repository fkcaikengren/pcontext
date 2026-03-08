import { newEnforcer, newModelFromString } from 'casbin'
import AppSettings from '@/settings'
import { getCasbinAdapter } from './adapter'

const RBAC_MODEL = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = (r.sub == p.sub || g(r.sub, p.sub)) && keyMatch2(r.obj, p.obj) && regexMatch(r.act, p.act)
`

let enforcerPromise: Promise<import('casbin').Enforcer> | null = null

const SEED_POLICIES: [string, string, string][] = [
  ['admin', '/api/*', '.*'],

  ['user', '/api/health', 'GET'],
  ['user', '/api/users', 'GET'],
  ['guest', '/api/docs/query', 'GET'],
  ['guest', '/api/docs/latest', 'GET'],
  ['user', '/api/docs/*/favorite', 'POST'],
  ['guest', '/api/chat', 'POST'],
  ['guest', '/api/ranking/docs', 'GET'],
  ['user', '/api/users/login', 'POST'],
  ['user', '/api/users/logout', 'POST'],
  ['user', '/api/users/me', 'GET'],
  ['user', '/api/tasks/*', 'GET'],
  ['user', '/api/tasks/*/progress', 'GET'],
  ['guest', '/api/mcp', '.*'],

  ['guest', '/api/health', 'GET'],
  ['guest', '/api/docs', 'GET'],
  ['guest', '/api/docs/query', 'GET'],
  ['guest', '/api/docs/latest', 'GET'],
  ['guest', '/api/chat', 'POST'],
  ['guest', '/api/ranking/docs', 'GET'],
  ['guest', '/api/users/login', 'POST'],
  ['guest', '/api/users/logout', 'POST'],
  ['guest', '/api/users/me', 'GET'],
  ['guest', '/api/mcp', '.*'],
]

// TODO: 增加表配置前端权限
// role, permissionCode
// const SEED_FRONT_PERMISSIONS = []

export function initEnforcer(): Promise<import('casbin').Enforcer>
export function initEnforcer(adapter: import('casbin').Adapter): Promise<import('casbin').Enforcer>
export async function initEnforcer(adapter?: import('casbin').Adapter) {
  if (AppSettings.global.enforcer) {
    return Promise.resolve(AppSettings.global.enforcer as import('casbin').Enforcer)
  }
  if (!enforcerPromise) {
    enforcerPromise = (async () => {
      const model = newModelFromString(RBAC_MODEL)
      const actualAdapter = adapter ?? getCasbinAdapter()
      const e = await newEnforcer(model, actualAdapter)

      const policies = await e.getPolicy()
      const existing = new Set((policies ?? []).map(p => p.join('|')))
      const missing = SEED_POLICIES.filter(p => !existing.has(p.join('|')))
      if (missing.length > 0) {
        e.enableAutoSave(false)
        await e.addPolicies(missing)
        await e.savePolicy()
        e.enableAutoSave(true)
      }

      AppSettings.global.enforcer = e
      return e
    })()
  }
  return enforcerPromise as Promise<import('casbin').Enforcer>
}

export function getEnforcer() {
  if (!AppSettings.global.enforcer) {
    throw new Error('Enforcer not initialized, call initEnforcer() at startup')
  }
  return AppSettings.global.enforcer as import('casbin').Enforcer
}
