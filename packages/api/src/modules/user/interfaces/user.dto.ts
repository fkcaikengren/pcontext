import { z } from 'zod'
import { paginationQuerySchema } from '@/shared/dto'

export const userLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
})

export const baseUserSchema = z.object({
  username: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  phone: z.string().min(1).max(32),
  email: z.string().email().max(254),
  role: z.enum(['admin', 'user']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const createUserSchema = baseUserSchema.extend({
  password: z.string().min(1).max(128),
})

export const updateUserSchema = baseUserSchema.partial().extend({
  password: z.string().min(1).max(128).optional(),
})

export const updateSelfSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  password: z.string().min(1).max(128).optional(),
  phone: z.string().min(1).max(32).optional(),
  email: z.string().email().max(254).optional(),
})

export const listUsersQuerySchema = paginationQuerySchema.extend({
  name: z.string().optional(),
})

export const updateUserRolesSchema = z.object({
  roles: z.array(z.enum(['admin', 'user'])).min(1),
})

export const adminCreateUserBodySchema = createUserSchema.omit({
  status: true,
})

export const adminUpdateUserBodySchema = updateUserSchema

export type UserLoginDTO = z.infer<typeof userLoginSchema>
export type BaseUserDTO = z.infer<typeof baseUserSchema>
export type CreateUserDTO = z.infer<typeof createUserSchema>
export type UpdateUserDTO = z.infer<typeof updateUserSchema>
export type UpdateSelfDTO = z.infer<typeof updateSelfSchema>
export type ListUsersQueryDTO = z.infer<typeof listUsersQuerySchema>
export type UpdateUserRolesDTO = z.infer<typeof updateUserRolesSchema>
export type AdminCreateUserDTO = z.infer<typeof adminCreateUserBodySchema>
export type AdminUpdateUserDTO = z.infer<typeof adminUpdateUserBodySchema>
