import type { PaginationVO } from '@/shared/vo'
import type { UserEntity } from './user.entity.ts'
import type { CreateUserDTO, UpdateSelfDTO, UpdateUserDTO } from './user.dto'

export interface AuthUserRecord {
  id: number
  username: string
  password: string
  role: UserEntity['role']
  status: UserEntity['status']
}

export interface IUserRepository {
  findById: (id: number) => Promise<UserEntity | null>
  findByUsername: (username: string) => Promise<UserEntity | null>
  findByPhone: (phone: string) => Promise<UserEntity | null>
  findByEmail: (email: string) => Promise<UserEntity | null>
  list: (page: number, pageSize: number, filters?: { name?: string }) => Promise<PaginationVO<UserEntity>>
  create: (input: CreateUserDTO) => Promise<UserEntity>
  updateById: (id: number, input: UpdateUserDTO) => Promise<UserEntity | null>
  updateSelf: (id: number, input: UpdateSelfDTO) => Promise<UserEntity | null>
  findAuthByUsername: (username: string) => Promise<AuthUserRecord | null>
}
