import type { Context } from 'hono'

export function getCurrentUserId(c: Context) {
	const user = c.get('user') as { id: number | null } | undefined
	const id = user?.id
	return typeof id === 'number' && Number.isFinite(id) ? id : null
}

export function isAdmin(c: Context) {
	const user = c.get('user') as { role: 'admin' | 'user' | null } | undefined
	return user?.role === 'admin'
}
