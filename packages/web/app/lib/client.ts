
import type { AppType } from '@pcontext/api'
import { hc } from 'hono/client'


const baseUrl = import.meta.env.VITE_BASE_URL || ''
export const client = hc<AppType>('/')

