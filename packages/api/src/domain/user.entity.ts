import { z } from 'zod'

export type UserRole = 'admin' | 'user'
export type UserStatus = 'active' | 'inactive'

export interface User {
  id: number
  username: string
  name: string
  phone: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: Date
  updatedAt: Date
}

export interface BaseUserInput {
  username: string
  name: string
  phone: string
  email: string
  role?: UserRole
  status?: UserStatus
}

export interface CreateUserInput extends BaseUserInput {
  password: string
}

export interface UpdateUserInput extends Partial<BaseUserInput> {
  password?: string
}

export interface UpdateSelfInput {
  name?: string
  password?: string
  phone?: string
  email?: string
}

const baseUserSchema = z.object({
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

export interface Pagination<T> {
  list: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  next_url?: string | null
  prev_url?: string | null
}
