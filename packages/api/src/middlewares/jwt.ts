import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import AppSettings from '../settings'

const { config } = AppSettings


export function jwt(): MiddlewareHandler {
  return async (c, next) => {
    const accessToken = getCookie(c, 'access_token')

    if (accessToken) {
      try {
        const payload = await verify(accessToken, config.jwt_secret)
        if (payload && typeof payload === 'object') {
          const sub = typeof payload.sub === 'string' ? Number.parseInt(payload.sub, 10) : (typeof payload.sub === 'number' ? payload.sub : Number.NaN)
          const id = Number.isFinite(sub) ? sub : null
          const username = typeof (payload as any).username === 'string' ? (payload as any).username : ''
          const role = (payload as any).role === 'admin' || (payload as any).role === 'user' ? (payload as any).role : null
          if (id) {
            c.set('user', { id, username, role })
          }
        }
      } catch {
        c.set('user', null)
      }
    } else {
      c.set('user', null)
    }

    await next()
  }
}
