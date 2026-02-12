import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createRouter } from '@/lib/create-app'
import { validatePaginationQuery } from '@/utils/pagination'
import type { UserRole } from '@/domain/user.entity'
import {
  createUser,
  getUserById,
  getUserRoles,
  listUsers,
  softDeleteUser,
  updateUserRoles,
  updateUserWithValidation,
} from '@/services/user.service'

const router = createRouter()
  .get('/', async (c) => {
    const query = c.req.query()
    const { page, limit, name } = validatePaginationQuery(query)
    const result = await listUsers(page, limit, { name })
    return c.json(result)
  })
  .post('/add', zValidator('json', z.object({
    username: z.string().min(1).max(64),
    password: z.string().min(1).max(128),
    name: z.string().min(1).max(128),
    phone: z.string().min(1).max(32),
    email: z.string().email().max(254),
    role: z.enum(['admin', 'user']).optional(),
  })), async (c) => {
    const { username, password, name, phone, email, role } = await c.req.json<{
      username: string
      password: string
      name: string
      phone: string
      email: string
      role?: UserRole
    }>()

    try {
      const created = await createUser({
        username,
        password,
        name,
        phone,
        email,
        role,
      })

      return c.json(created, 201)
    } catch (e: any) {
      return c.json({ message: e.message }, 400)
    }
  })
  .get('/:id', async (c) => {
    const { id } = c.req.param()
    if (!id) return c.json({ message: '用户ID不能为空' }, 400)

    const user = await getUserById(Number(id))
    if (!user) return c.json({ message: '用户不存在' }, 404)

    return c.json(user)
  })
  .post('/:id/update', zValidator('json', z.object({
    username: z.string().min(1).max(64).optional(),
    password: z.string().min(1).max(128).optional(),
    name: z.string().min(1).max(128).optional(),
    phone: z.string().min(1).max(32).optional(),
    email: z.string().email().max(254).optional(),
    role: z.enum(['admin', 'user']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })), async (c) => {
    const { id } = c.req.param()
    if (!id) return c.json({ message: '用户ID不能为空' }, 400)

    const userId = Number(id)
    const body = await c.req.json<{
      username?: string
      password?: string
      name?: string
      phone?: string
      email?: string
      role?: UserRole
      status?: 'active' | 'inactive'
    }>()

    if (Object.keys(body).length === 0) {
      const existing = await getUserById(userId)
      if (!existing) return c.json({ message: '用户不存在' }, 404)
      return c.json(existing)
    }

    try {
      const updated = await updateUserWithValidation(userId, body)
      if (!updated) return c.json({ message: '用户不存在' }, 404)
      return c.json(updated)
    } catch (e: any) {
      return c.json({ message: e.message }, 400)
    }
  })
  .post('/:id/delete', async (c) => {
    const { id } = c.req.param()
    if (!id) return c.json({ message: '用户ID不能为空' }, 400)

    const userId = Number(id)
    const updated = await softDeleteUser(userId)
    if (!updated) return c.json({ message: '用户不存在' }, 404)
    return c.json(updated)
  })
  .get('/:id/roles', async (c) => {
    const { id } = c.req.param()
    if (!id) return c.json({ message: '用户ID不能为空' }, 400)

    const userId = Number(id)
    const roles = await getUserRoles(userId)
    if (!roles) return c.json({ message: '用户不存在' }, 404)

    return c.json({ roles })
  })
  .post('/:id/update-role', zValidator('json', z.object({
    roles: z.array(z.enum(['admin', 'user'])).min(1),
  })), async (c) => {
    const { id } = c.req.param()
    if (!id) return c.json({ message: '用户ID不能为空' }, 400)

    const userId = Number(id)
    const { roles } = await c.req.json<{ roles: UserRole[] }>()
    const result = await updateUserRoles(userId, roles)
    if (!result.user) return c.json({ message: '用户不存在' }, 404)
    return c.json(result)
  })

export default router
