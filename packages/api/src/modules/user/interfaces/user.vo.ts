import { z } from 'zod'

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'user']),
  status: z.enum(['active', 'inactive']),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type UserVO = z.infer<typeof userSchema>

export interface LoginResultVO { user: UserVO, token: string }
