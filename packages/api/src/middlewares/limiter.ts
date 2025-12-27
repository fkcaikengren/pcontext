import type { MiddlewareHandler } from 'hono'

export function limiter(_limit: number): MiddlewareHandler {
  return async (_c, next) => {
    await next()
  }
}

