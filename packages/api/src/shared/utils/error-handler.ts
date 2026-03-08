import type { ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { HttpError } from '@pcontext/shared'

export const errorHandler: ErrorHandler = (err, c) => {
  const logger = c.get('logger')
  let status: ContentfulStatusCode = 500
  let message = 'Unknown error'
  let code: number | undefined = 500
  let data: Record<string, any> | null = null

  const anyErr = err as any
  if (anyErr instanceof HttpError) {
    status = anyErr.code as ContentfulStatusCode
    message = anyErr.message
    code = anyErr.code
    data = anyErr.data
  }
  else if (err instanceof Error) {
    message = err.message
  }

  if (logger) {
    logger.error({ err, path: c.req.path, method: c.req.path, status }, 'Unhandled error')
  }

  const responseBody: { message: string, code?: number, data?: Record<string, any> | null } = { code, data, message }

  return c.json(responseBody, status)
}
