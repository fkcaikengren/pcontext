export type UserRole = 'admin' | 'user'
export type UserStatus = 'active' | 'inactive'

export interface UserEntity {
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
