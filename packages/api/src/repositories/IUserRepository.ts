import type { CreateUserInput, Pagination, UpdateSelfInput, UpdateUserInput, User } from '../domain/user.entity.ts'

export interface AuthUserRecord {
  id: number
  username: string
  password: string
  role: User['role']
  status: User['status']
}

export interface IUserRepository {
  findById: (id: number) => Promise<User | null>
  findByUsername: (username: string) => Promise<User | null>
  findByPhone: (phone: string) => Promise<User | null>
  findByEmail: (email: string) => Promise<User | null>
  list: (page: number, limit: number, filters?: { name?: string }) => Promise<Pagination<User>>
  create: (input: CreateUserInput) => Promise<User>
  updateById: (id: number, input: UpdateUserInput) => Promise<User | null>
  updateSelf: (id: number, input: UpdateSelfInput) => Promise<User | null>
  findAuthByUsername: (username: string) => Promise<AuthUserRecord | null>
}
