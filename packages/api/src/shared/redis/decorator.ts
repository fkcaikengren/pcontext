import { getRedis } from './factory'

// ==================== 类型定义 ====================

interface CacheOptions {
  /** 缓存 key，优先级高于 keyGenerator */
  key?: string | ((...args: any[]) => string)
  /** TTL 秒数，默认 3600 (1小时) */
  ttl?: number
  /** 缓存标签，用于批量失效 */
  tags?: (...args: any[]) => string[]
}

interface InvalidateOptions {
  /** 要失效的缓存 key 列表 */
  keys?: (...args: any[]) => string[]
  /** 是否清除该 service 下所有缓存 */
  all?: boolean
  /** 要失效的标签（推荐使用 tag 机制） */
  tags?: (...args: any[]) => string[]
  /** 目标命名空间，指定要失效哪些 namespace 下的缓存 */
  namespace?: string | string[] | '*'
}

// ==================== 内部存储 ====================

// 标签 -> 缓存 key 集合的映射（用于 tag 失效）
const tagCacheMap = new Map<string, Set<string>>()

// ==================== 工具函数 ====================

/**
 * 生成默认缓存 key
 */
function generateDefaultKey(target: any, key: string, args: any[]): string {
  const className = target.constructor?.name || 'anonymous'
  return `${className}:${key}:${JSON.stringify(args)}`
}

/**
 * 将缓存 key 关联到标签
 */
function associateTag(cacheKey: string, tags: string[]) {
  for (const tag of tags) {
    if (!tagCacheMap.has(tag)) {
      tagCacheMap.set(tag, new Set())
    }
    tagCacheMap.get(tag)!.add(cacheKey)
  }
}

/**
 * 清除标签关联的缓存
 * @param tags 要失效的标签列表（不含 namespace 前缀）
 * @param namespace 目标 namespace，用于拼接标签前缀（string | string[] | '*' | undefined）
 *        - undefined：不传，默认使用当前 namespace
 *        - string：单个 namespace
 *        - string[]：多个 namespace
 *        - '*'：不过滤，使用原始 tag 匹配所有
 * @param currentNamespace 当前 service 的 namespace，用于默认值
 */
async function invalidateTags(
  tags: string[],
  namespace: string | string[] | '*' | undefined,
  currentNamespace: string,
): Promise<void> {
  const redis = getRedis()

  // 解析目标 namespace
  let targetNamespaces: string[]
  if (namespace === '*') {
    targetNamespaces = [] // 空数组表示不过滤，使用原始 tag
  }
  else if (Array.isArray(namespace)) {
    targetNamespaces = namespace
  }
  else if (namespace) {
    targetNamespaces = [namespace]
  }
  else {
    targetNamespaces = [currentNamespace] // 默认使用当前 namespace
  }

  for (const tag of tags) {
    // 根据 targetNamespaces 生成要匹配的标签列表
    const tagsToMatch = targetNamespaces.length > 0
      ? targetNamespaces.map(ns => `${ns}:${tag}`)
      : [tag] // '*' 时使用原始 tag

    let keysToDelete: string[] = []

    for (const tagToMatch of tagsToMatch) {
      const cacheKeys = tagCacheMap.get(tagToMatch)
      if (cacheKeys && cacheKeys.size > 0) {
        keysToDelete = keysToDelete.concat(Array.from(cacheKeys))
      }
    }

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete)
    }

    // 清除标签映射
    for (const tagToMatch of tagsToMatch) {
      tagCacheMap.delete(tagToMatch)
    }
  }
}

// ==================== 类级别装饰器 ====================

/**
 * 标记为缓存服务
 * - 为每个 service 创建 cache namespace
 * - 提供统一 key 生成器
 *
 * @param namespace 自定义命名空间，默认使用类名
 *
 * @example
 * ```ts
 * @CacheableService()
 * class UserService {
 *   @Cache({ key: (id) => `user:${id}` })
 *   async getUser(id: number) { ... }
 * }
 * ```
 *
 * @example
 * ```ts
 * @CacheableService('customNamespace')
 * class CustomService { ... }
 * ```
 */
function CacheableService(namespace?: string) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const ns = namespace || constructor.name
    constructor.prototype.__cacheNamespace = ns
    return constructor
  }
}

// ==================== 方法级别装饰器 ====================

/**
 * 缓存装饰器
 * - 从 Redis 获取/存储缓存
 * - 支持自定义 key 和 TTL
 * - 支持标签机制
 *
 * @param options 配置选项
 *
 * @example
 * // 基础用法
 * @Cache()
 * async getUser(id: number) { ... }
 *
 * @example
 * // 自定义 TTL
 * @Cache({ ttl: 600 })
 * async getData() { ... }
 *
 * @example
 * // 自定义 key 函数
 * @Cache({ key: (id, name) => `user:${id}:${name}` })
 * async getUser(id: number, name: string) { ... }
 *
 * @example
 * // 使用标签（推荐）
 * @Cache({ tags: (id) => [`user:${id}`] })
 * async getUser(id: number) { ... }
 */
function Cache(options: CacheOptions = {}) {
  const { ttl = 3600 } = options

  return function (target: any, _key: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const redis = getRedis()
      const self = this as any
      const namespace = self.__cacheNamespace || target.constructor?.name || 'anonymous'

      // 生成缓存 key
      let cacheKey: string
      if (typeof options.key === 'function') {
        cacheKey = options.key(...args)
      }
      else if (typeof options.key === 'string') {
        cacheKey = options.key
      }
      else {
        cacheKey = generateDefaultKey(target, _key, args)
      }

      // 添加命名空间前缀
      const fullCacheKey = `${namespace}:${cacheKey}`

      // 处理标签关联（标签带 namespace 前缀以避免冲突）
      if (options.tags) {
        const tags = options.tags(...args)
        const fullTags = tags.map(tag => `${namespace}:${tag}`)
        associateTag(fullCacheKey, fullTags)
      }

      // 尝试从 Redis 获取
      const cached = await redis.get(fullCacheKey)
      if (cached !== null) {
        return JSON.parse(cached)
      }

      // 执行原函数
      const result = await original.apply(this, args)

      // 缓存结果
      if (result !== undefined && result !== null) {
        await redis.setex(fullCacheKey, ttl, JSON.stringify(result))
      }

      return result
    }

    return descriptor
  }
}

/**
 * 缓存失效装饰器
 * - 支持指定 key 失效（仅当前 namespace）
 * - 支持清除该 service 下所有缓存
 * - 支持标签失效（推荐，支持跨 namespace）
 *
 * @param options 配置选项
 *
 * @example
 * // 指定 key 失效（仅当前 namespace）
 * @Invalidate({ keys: (id) => [`getUser:${id}`] })
 * async updateUser(id: number) { ... }
 *
 * @example
 * // 使用标签失效（推荐，仅当前 namespace）
 * @Invalidate({ tags: (id) => [`user:${id}`] })
 * async updateUser(id: number) { ... }
 *
 * @example
 * // 清除该 service 下所有缓存
 * @Invalidate({ all: true })
 * async clearAllCache() { ... }
 *
 * @example
 * // 跨 namespace 失效 - 使用标签失效指定 namespace 的缓存
 * @Invalidate({ tags: (id) => ['task:123'], namespace: 'DocService' })
 * async updateTask(id: number) { ... }
 *
 * @example
 * // 跨 namespace 失效 - 使用标签失效多个 namespace 的缓存
 * @Invalidate({ tags: (id) => ['task:123'], namespace: ['DocService', 'RankService'] })
 * async updateTask(id: number) { ... }
 *
 * @example
 * // 跨 namespace 失效 - 使用标签失效所有 namespace 的缓存
 * @Invalidate({ tags: (id) => ['task:123'], namespace: '*' })
 * async updateTask(id: number) { ... }
 */
function Invalidate(options: InvalidateOptions = {}) {
  return function (target: any, _key: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const redis = getRedis()
      const self = this as any
      const namespace = self.__cacheNamespace || target.constructor?.name || 'anonymous'

      // 1. 先执行原函数
      const result = await original.apply(this, args)

      // 2. 处理缓存失效
      try {
        // 方式一：清除所有缓存
        if (options.all) {
          let cursor = '0'
          do {
            const [nextCursor, keys] = await redis.scan(
              cursor,
              'MATCH',
              `${namespace}:*`,
              'COUNT',
              100,
            )
            cursor = nextCursor
            if (keys.length > 0) {
              await redis.del(...keys)
            }
          } while (cursor !== '0')

          // 清除标签映射
          for (const [tag, cacheKeys] of Array.from(tagCacheMap.entries())) {
            if (tag.startsWith(namespace)) {
              cacheKeys.clear()
              tagCacheMap.delete(tag)
            }
          }

          return result
        }

        // 方式二：指定 key 失效（仅支持当前 namespace）
        if (options.keys) {
          const keys = options.keys(...args)
          const fullKeys = keys.map(k => `${namespace}:${k}`)
          await redis.del(...fullKeys)

          // 清除标签映射中的 key
          for (const [, cacheKeys] of Array.from(tagCacheMap.entries())) {
            for (const k of fullKeys) {
              cacheKeys.delete(k)
            }
          }
        }

        // 方式三：标签失效（推荐）
        if (options.tags) {
          const tags = options.tags(...args)
          await invalidateTags(tags, options.namespace, namespace)
        }
      }
      catch (error) {
        console.error('Cache invalidation failed:', error)
      }

      return result
    }

    return descriptor
  }
}

// ==================== 导出 ====================

export { Cache, CacheableService, Invalidate }
export type { CacheOptions, InvalidateOptions }
