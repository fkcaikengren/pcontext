import { createRouter } from '@/shared/create-app'
import type { UserRole } from '@/modules/user/user.entity'
import {
  adminCreateUserBodySchema,
  adminUpdateUserBodySchema,
  listUsersQuerySchema,
  updateUserRolesSchema,
  type AdminCreateUserDTO,
  type AdminUpdateUserDTO,
  type ListUsersQueryDTO,
  type UpdateUserRolesDTO,
} from '@/modules/user/user.dto'
import {
  createUser,
  getUserById,
  getUserRoles,
  listUsers,
  softDeleteUser,
  updateUserRoles,
  updateUserWithValidation,
} from '@/modules/user/user.service'
import { jsonValidator, queryValidator } from '@/shared/utils/validator'

const router = createRouter()
  .get('/', queryValidator(listUsersQuerySchema), async (c) => {
    const { page, pageSize, name } = c.req.valid('query') as ListUsersQueryDTO
    const result = await listUsers(page, pageSize, { name })
    return c.json(result)
  })
  .post('/add', jsonValidator(adminCreateUserBodySchema), async (c) => {
    const { username, password, name, phone, email, role } = c.req.valid('json') as AdminCreateUserDTO
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
  .post('/:id/update', jsonValidator(adminUpdateUserBodySchema), async (c) => {
    const { id } = c.req.param()
    if (!id) return c.json({ message: '用户ID不能为空' }, 400)

    const userId = Number(id)
    const body = c.req.valid('json') as AdminUpdateUserDTO

    if (Object.keys(body).length === 0) {
      const existing = await getUserById(userId)
      if (!existing) return c.json({ message: '用户不存在' }, 404)
      return c.json(existing)
    }

    try {
      const updated = await updateUserWithValidation(userId, body as any)
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
  .post('/:id/update-role', jsonValidator(updateUserRolesSchema), async (c) => {
    const { id } = c.req.param()
    if (!id) return c.json({ message: '用户ID不能为空' }, 400)

    const userId = Number(id)
    const { roles } = c.req.valid('json') as UpdateUserRolesDTO
    const result = await updateUserRoles(userId, roles as UserRole[])
    if (!result.user) return c.json({ message: '用户不存在' }, 404)
    return c.json(result)
  })

export default router
