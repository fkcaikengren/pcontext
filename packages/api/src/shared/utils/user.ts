import type { Context } from 'hono'

export function getCurrentUserId(c: Context) {
  const user = c.get('user')
  return user?.id as number
}

export function isAdmin(c: Context) {
  const user = c.get('user') as { role: 'admin' | 'user' | null } | undefined
  return user?.role === 'admin'
}
