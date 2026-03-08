import { newEnforcer, newModelFromString } from 'casbin'
import AppSettings from '@/settings'
import { getVersion } from '@/shared/system'
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
  // TODO: 补充user权限，和添加用户功能一起完成

  ['guest', '/api/health', 'GET'],
  ['guest', '/api/docs', 'GET'],
  ['guest', '/api/docs/*', 'GET'],
  ['guest', '/api/docs/query', 'GET'],
  ['guest', '/api/docs/latest', 'GET'],
  ['guest', '/api/ranking/docs', 'GET'],
  ['guest', '/api/chat', 'POST'],
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

      const appVersion = await getVersion()
      if (AppSettings.config.is_dev || AppSettings.global.version !== appVersion) {
        // 用 SEED_POLICIES 覆盖原有数据
        e.enableAutoSave(false)
        e.clearPolicy()
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
