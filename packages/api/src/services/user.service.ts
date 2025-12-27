import argon2 from 'argon2'
import { sign } from 'hono/jwt'
import AppSettings from '../settings'
import { getEnforcer } from '@/infrastructure/casbin/enforcer'
import type {
  CreateUserInput,
  Pagination,
  UpdateSelfInput,
  UpdateUserInput,
  User,
  UserRole,
} from '../domain/user.entity.ts'
import { logger } from '../lib/logger'
import { getRepositories } from '../repositories/repo.factory.ts'

export async function login(input: Pick<CreateUserInput, 'username' | 'password'>): Promise<{ user: User; token: string }> {
  const { userRepo } = getRepositories()
  console.log('========login', input);
  const authUser = await userRepo.findAuthByUsername(input.username)
  if (!authUser) {
    throw new Error('用户不存在')
  }

  const valid = await argon2.verify(authUser.password, input.password)
  if (!valid) {
    throw new Error('密码错误')
  }

  if (authUser.status !== 'active') {
    throw new Error('用户已被禁用')
  }

  const token = await sign({ sub: String(authUser.id), username: authUser.username, role: authUser.role }, AppSettings.config.jwt_secret)
  const user = await getUserById(authUser.id)
  if (!user) {
    throw new Error('用户不存在')
  }
  logger.info({ userId: user.id, username: user.username }, 'user login')
  return { user, token }
}

export async function getUserById(id: number): Promise<User | null> {
  const { userRepo } = getRepositories()
  return userRepo.findById(id)
}

export async function listUsers(
  page: number,
  limit: number,
  filters?: { name?: string },
): Promise<Pagination<User>> {
  const { userRepo } = getRepositories()
  return userRepo.list(page, limit, filters)
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { userRepo } = getRepositories()

  const hasUser = await userRepo.findByUsername(input.username)
  if (hasUser) {
    throw new Error('用户已存在')
  }

  const hasPhone = await userRepo.findByPhone(input.phone)
  if (hasPhone) {
    throw new Error('手机号已存在')
  }

  const hasEmail = await userRepo.findByEmail(input.email)
  if (hasEmail) {
    throw new Error('邮箱已存在')
  }

  const hashedPassword = await argon2.hash(input.password)
  const created = await userRepo.create({ ...input, password: hashedPassword })

  const primaryRole: UserRole = input.role ?? 'user'
  const enforcer = getEnforcer()
  await enforcer.addRoleForUser(created.username, primaryRole)

  logger.info({ userId: created.id, username: created.username }, 'user created')
  return created
}

export async function updateUserById(id: number, input: UpdateUserInput): Promise<User | null> {
  const { userRepo } = getRepositories()
  const patch: UpdateUserInput = { ...input }
  if (patch.password !== undefined) {
    patch.password = await argon2.hash(patch.password)
  }
  return userRepo.updateById(id, patch)
}

export async function updateUserWithValidation(id: number, input: UpdateUserInput): Promise<User | null> {
  const { userRepo } = getRepositories()
  const existing = await userRepo.findById(id)
  if (!existing) {
    return null
  }

  const patch: UpdateUserInput = { ...input }

  if (patch.username !== undefined) {
    const userByName = await userRepo.findByUsername(patch.username)
    if (userByName && userByName.id !== id) {
      throw new Error('用户名已存在')
    }
  }

  if (patch.phone !== undefined) {
    const userByPhone = await userRepo.findByPhone(patch.phone)
    if (userByPhone && userByPhone.id !== id) {
      throw new Error('手机号已存在')
    }
  }

  if (patch.email !== undefined) {
    const userByEmail = await userRepo.findByEmail(patch.email)
    if (userByEmail && userByEmail.id !== id) {
      throw new Error('邮箱已存在')
    }
  }

  const updated = await updateUserById(id, patch)
  if (!updated) {
    return null
  }

  if (patch.role !== undefined && patch.role !== existing.role) {
    const enforcer = getEnforcer()
    await enforcer.deleteRolesForUser(existing.username)
    await enforcer.addRoleForUser(existing.username, patch.role)
  }

  return updated
}

export async function updateSelf(id: number, input: UpdateSelfInput): Promise<User | null> {
  const { userRepo } = getRepositories()
  const patch: UpdateSelfInput = { ...input }
  if (patch.password !== undefined) {
    patch.password = await argon2.hash(patch.password)
  }
  return userRepo.updateSelf(id, patch)
}

export async function softDeleteUser(id: number): Promise<User | null> {
  const existing = await getUserById(id)
  if (!existing) {
    return null
  }

  const updated = await updateUserById(id, { status: 'inactive' })
  if (!updated) {
    return null
  }

  const enforcer = getEnforcer()
  await enforcer.deleteUser(existing.username)

  return updated
}

export async function getUserRoles(id: number): Promise<UserRole[] | null> {
  const user = await getUserById(id)
  if (!user) {
    return null
  }
  const enforcer = getEnforcer()
  const roles = await enforcer.getRolesForUser(user.username)
  const casbinRoles = roles.filter((r): r is UserRole => r === 'admin' || r === 'user')
  if (casbinRoles.length === 0) {
    return [user.role]
  }
  return casbinRoles
}

export async function updateUserRoles(id: number, roles: UserRole[]): Promise<{ user: User | null, roles: UserRole[] }> {
  const primaryRole = roles[0]
  const user = await getUserById(id)
  if (!user) {
    return { user: null, roles: [] }
  }

  const updated = await updateUserById(id, { role: primaryRole })
  if (!updated) {
    return { user: null, roles: [] }
  }

  const enforcer = getEnforcer()
  await enforcer.deleteRolesForUser(user.username)
  for (const role of roles) {
    await enforcer.addRoleForUser(user.username, role)
  }

  return { user: updated, roles }
}
