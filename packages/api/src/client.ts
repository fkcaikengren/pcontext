import { hc } from 'hono/client'
import type { AppType } from './server'
export type * from './types'



export function createClient( ...args: Parameters<typeof hc>) {
  return hc<AppType>(...args)
}


export const client = hc<AppType>('localhost:3000/api')

