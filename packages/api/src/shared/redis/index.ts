import { Redis } from 'ioredis'
import AppSettings from '@/settings'

const { config } = AppSettings

let redisClient: Redis | null = null
let initialized = false

/**
 * 创建 Redis 客户端实例
 */
export function createRedisClient(): Redis {
  const redisConfig = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  }
  return new Redis(redisConfig)
}

/**
 * 初始化 Redis 连接
 */
export async function initRedis() {
  if (initialized)
    return
  redisClient = createRedisClient()
  initialized = true
}

function ensureInitialized() {
  if (!initialized) {
    throw new Error('Redis not initialized, call initRedis() at startup')
  }
}

/**
 * 获取 Redis 客户端实例
 */
export function getRedis(): Redis {
  ensureInitialized()
  if (!redisClient) {
    throw new Error('Redis client not initialized')
  }
  return redisClient
}

/**
 * Redis 客户端实例（保留向后兼容）
 * @deprecated 请使用 getRedis() 替代
 */
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedis()
    return (client as any)[prop]
  },
})
