import { Redis } from 'ioredis'
import AppSettings from '@/settings'

const { config } = AppSettings

/**
 * Redis 客户端实例
 */
export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
})
