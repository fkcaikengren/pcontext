import type { AppType } from './server'
import { hc } from 'hono/client'

export * from './shared/dto'
export * from './shared/vo'
export type * from './types'
export * from '@/modules/doc/doc.dto'
export * from '@/modules/doc/doc.vo'
export * from '@/modules/task/task.dto'
export * from '@/modules/task/task.vo'
export * from '@/modules/user/user.dto'
// export * from '@/modules/user/user.vo'

export function createClient(...args: Parameters<typeof hc>) {
  return hc<AppType>(...args)
}

export const client = hc<AppType>('localhost:3000/api')
