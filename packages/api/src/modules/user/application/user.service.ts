import type { UserRole } from '@/modules/user/domain/user.entity'
import type { CreateUserDTO, UpdateSelfDTO, UpdateUserDTO } from '@/modules/user/interfaces/user.dto'
import type { LoginResultVO, UserVO } from '@/modules/user/interfaces/user.vo'
import type { PaginationVO } from '@/shared/vo'
import argon2 from 'argon2'
import { sign } from 'hono/jwt'
import { UserEntity } from '@/modules/user/domain/user.entity'
import { getEnforcer } from '@/modules/user/infrastructure/casbin/enforcer'
import { userSchema } from '@/modules/user/interfaces/user.vo'
import AppSettings from '@/settings'
import { getRepoDeps } from '@/shared/deps'
import { logger } from '@/shared/logger'

export async function login(input: Pick<CreateUserDTO, 'username' | 'password'>): Promise<LoginResultVO> {
  const { userRepo } = getRepoDeps()
  const authUser = await userRepo.findByUsername(input.username)
  if (!authUser) {
    throw new Error('用户不存在')
  }

  const valid = await argon2.verify(authUser.password, input.password)
  if (!valid) {
    throw new Error('密码错误')
  }
  const user = new UserEntity({
    id: authUser.id,
    username: authUser.username,
    password: authUser.password,
    name: '',
    phone: '',
    email: '',
    role: authUser.role,
    status: authUser.status,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  user.ensureActive()
  const token = await sign({ sub: String(user.id), username: user.username, role: user.role }, AppSettings.config.jwt_secret, 'HS256')
  logger.info({ userId: user.id, username: user.username }, 'user login')
  return { user: userSchema.parse(user), token }
}

export async function getUserById(id: number): Promise<UserVO | null> {
  const { userRepo } = getRepoDeps()
  const user = await userRepo.findById(id)
  return user ? userSchema.parse(user) : null
}

export async function listUsers(
  page: number,
  pageSize: number,
  filters?: { name?: string },
): Promise<PaginationVO<UserVO>> {
  const { userRepo } = getRepoDeps()
  const result = await userRepo.list(page, pageSize, filters)
  return {
    ...result,
    list: result.list.map(item => userSchema.parse(item)),
  }
}

export async function createUser(input: CreateUserDTO): Promise<UserVO> {
  const { userRepo } = getRepoDeps()

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
  return userSchema.parse(created)
}

export async function updateUserById(id: number, input: UpdateUserDTO): Promise<UserVO | null> {
  const { userRepo } = getRepoDeps()
  const patch: UpdateUserDTO = { ...input }
  if (patch.password !== undefined) {
    patch.password = await argon2.hash(patch.password)
  }
  const updated = await userRepo.updateById(id, patch)
  return updated ? userSchema.parse(updated) : null
}

export async function updateUserWithValidation(id: number, input: UpdateUserDTO): Promise<UserVO | null> {
  const { userRepo } = getRepoDeps()
  const existing = await userRepo.findById(id)
  if (!existing) {
    return null
  }

  const patch: UpdateUserDTO = { ...input }

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

export async function updateSelf(id: number, input: UpdateSelfDTO): Promise<UserVO | null> {
  const { userRepo } = getRepoDeps()
  const patch: UpdateSelfDTO = { ...input }
  if (patch.password !== undefined) {
    patch.password = await argon2.hash(patch.password)
  }
  const updated = await userRepo.updateSelf(id, patch)
  return updated ? userSchema.parse(updated) : null
}

export async function softDeleteUser(id: number): Promise<UserVO | null> {
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

export async function updateUserRoles(id: number, roles: UserRole[]): Promise<{ user: UserVO | null, roles: UserRole[] }> {
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
