import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import AppSettings from '@/settings'
import { logger } from '@/shared/logger'

export function jwt(): MiddlewareHandler {
  return async (c, next) => {
    const accessToken = getCookie(c, 'access_token')
    // console.log('JWT Middleware, access_token:', accessToken)
    if (accessToken) {
      try {
        const payload = await verify(accessToken, AppSettings.config.jwt_secret, 'HS256')
        if (payload && typeof payload === 'object') {
          const sub = typeof payload.sub === 'string'
            ? Number.parseInt(payload.sub, 10)
            : (typeof payload.sub === 'number' ? payload.sub : Number.NaN)
          const id = Number.isFinite(sub) ? sub : null
          const username = typeof (payload as any).username === 'string' ? (payload as any).username : ''
          const role = (payload as any).role === 'admin' || (payload as any).role === 'user' ? (payload as any).role : null
          if (id) {
            c.set('user', { id, username, role })
          }
        }
      }
      catch (err: any) {
        c.set('user', null)
        logger.error('JWT verification failed:', err)
      }
    }
    else {
      c.set('user', null)
    }

    await next()
  }
}
