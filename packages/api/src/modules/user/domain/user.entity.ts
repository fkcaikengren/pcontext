import type { UserPgPO, UserSqlitePO } from '../infrastructure/user.po'

type UserPO = UserPgPO | UserSqlitePO
export type UserRole = 'admin' | 'user'
export type UserStatus = 'active' | 'inactive'

export class UserEntity {
  id: number
  username: string
  password: string
  name: string
  phone: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: number
  updatedAt: number

  constructor(data: UserPO) {
    this.id = data.id ?? 0
    this.username = data.username ?? ''
    this.name = data.name ?? ''
    this.phone = data.phone ?? ''
    this.email = data.email ?? ''
    this.role = (data.role ?? 'user') as UserRole
    this.status = (data.status ?? 'active') as UserStatus
    this.password = data.password ?? ''
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  isActive(): boolean {
    return this.status === 'active'
  }

  ensureActive(): void {
    if (!this.isActive()) {
      throw new Error('用户已被禁用')
    }
  }
}
