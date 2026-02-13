import { createRouter } from '@/shared/create-app'
import { getEnforcer } from '@/modules/user/infrastructure/casbin/enforcer'

const ROLE_META: Record<string, { name: string, description: string }> = {
  admin: {
    name: '管理员',
    description: '系统管理员，拥有全部权限',
  },
  user: {
    name: '普通用户',
    description: '普通业务用户，具备基础访问能力',
  },
}

const router = createRouter()
  .get('/', async (c) => {
    const enforcer = getEnforcer()
    const policies = await enforcer.getPolicy()
    const roleIds = Array.from(new Set(policies.map(policy => policy[0]).filter(Boolean)))

    const roles = roleIds.map((id) => {
      const meta = ROLE_META[id] ?? { name: id, description: '' }
      return {
        id,
        name: meta.name,
        description: meta.description,
      }
    })

    return c.json({ roles })
  })
  .get('/:id', async (c) => {
    const { id } = c.req.param()
    if (!id) {
      return c.json({ message: '角色ID不能为空' }, 400)
    }

    const enforcer = getEnforcer()
    const policies = await enforcer.getFilteredPolicy(0, id)
    if (!policies || policies.length === 0) {
      return c.json({ message: '角色不存在' }, 404)
    }

    const meta = ROLE_META[id] ?? { name: id, description: '' }
    const permissions = policies.map(([, obj, act]) => `${act}:${obj}`)

    return c.json({
      id,
      name: meta.name,
      description: meta.description,
      permissions,
    })
  })
  .get('/:id/permissions', async (c) => {
    const { id } = c.req.param()
    if (!id) {
      return c.json({ message: '角色ID不能为空' }, 400)
    }

    const enforcer = getEnforcer()
    const policies = await enforcer.getFilteredPolicy(0, id)
    if (!policies || policies.length === 0) {
      return c.json({ message: '角色不存在' }, 404)
    }

    const permissions = policies.map(([, obj, act]) => `${act}:${obj}`)
    return c.json({
      id,
      permissions,
    })
  })

export default router
