import type { AppType } from './app'
import { hc } from 'hono/client'

export * from './shared/dto'
export type * from './shared/types'
export * from './shared/vo'
export * from '@/modules/doc/doc.dto'
export * from '@/modules/doc/doc.vo'
export * from '@/modules/rank/rank.vo'
export * from '@/modules/task/task.dto'
export * from '@/modules/task/task.vo'
export * from '@/modules/user/interfaces/user.dto'
export * from '@/modules/user/interfaces/user.vo'

export function createClient(...args: Parameters<typeof hc>) {
  return hc<AppType>(...args)
}
