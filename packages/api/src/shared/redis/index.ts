import type { Redis } from 'ioredis'
import { createRedisClient, getRedis, initRedis } from './factory'

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

export { createRedisClient, getRedis, initRedis }
