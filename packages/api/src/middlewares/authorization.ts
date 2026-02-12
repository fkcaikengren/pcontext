import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { getEnforcer } from '@/infrastructure/casbin/enforcer'
import { logger } from '@/lib/logger'


const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']
const SAFE_PATHS = ['/api/users/login']

export function authorization(config?: {
  safeMethods?: string[]
  safePaths?: string[]
}) {
  const {
    safeMethods = SAFE_METHODS,
    safePaths = SAFE_PATHS,
  } = config || {}
  return async (c: Context, next: Next)=> {
    if (c.req.method === 'OPTIONS') return next()
    const user = c.get('user') as { id: number; username: string; role: string | null } | undefined
    const hasRole = typeof user?.role === 'string' && user.role.length > 0

    
    if (!safeMethods.includes(c.req.method) && !safePaths.includes(c.req.path)) {
      const csrfCookie = getCookie(c, 'csrf_token')
      const csrfHeader = c.req.header('X-CSRF-Token')
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        logger.warn(`CSRF Token Mismatch, cookie csrf_token: ${csrfCookie}, header X-CSRF-Token: ${csrfHeader}`)
        return c.json({ message: 'CSRF Token Mismatch' }, 403)
      }
    }

    const enforcer = getEnforcer()
    const role = hasRole ? user!.role : 'guest'
    const obj = c.req.path
    const act = c.req.method
    logger.info(`Authorization, role: ${role}, obj: ${obj}, act: ${act}`)

    const allowed = await enforcer.enforce(role, obj, act)
    if (!allowed) {
      if (hasRole) {
        return c.json({ message: '无权限' }, 403)
      }
      return c.json({ message: '未登录或登录状态异常' }, 401)
    }
    return next()
  }
}
