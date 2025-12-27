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
  ['user', '/api/docs/add', 'POST'],
  ['user', '/api/docs/*/favorite', 'POST'],

  ['user', '/api/users/login', 'POST'],
  ['user', '/api/users/logout', 'POST'],
  ['user', '/api/users/me', 'GET'],
  ['user', '/api/tasks/*/progress', 'GET'],

  ['guest', '/api/health', 'GET'],
  ['guest', '/api/docs', 'GET'],
  ['guest', '/api/docs/*', 'GET'],
  ['guest', '/api/docs/*/check', 'POST'],
  ['guest', '/api/chat', 'POST'],
  
  ['guest', '/api/users/login', 'POST'],
  ['guest', '/api/users/logout', 'POST'],
  ['guest', '/api/users/me', 'GET'],
  ['guest', '/api/tasks/*/progress', 'GET'],
]

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
      if (!policies || policies.length === 0) {
        e.enableAutoSave(false)
        await e.addPolicies(SEED_POLICIES)
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
