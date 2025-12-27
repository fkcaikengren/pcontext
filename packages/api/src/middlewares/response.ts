import type { MiddlewareHandler } from 'hono'

export const responseWrapper: MiddlewareHandler = async (c, next) => {
  await next()

  const originalResponse = c.res
  const contentType = originalResponse.headers.get('Content-Type') || ''

  if (!contentType.toLowerCase().startsWith('application/json')) {
    return
  }

  let rawBody: unknown
  try {
    const cloned = originalResponse.clone()
    rawBody = await cloned.json()
  } catch {
    return
  }

  const status = originalResponse.status || 200
  const isSuccess = status >= 200 && status < 300

  const bodyObject = (rawBody && typeof rawBody === 'object') ? rawBody as Record<string, unknown> : {}
  const alreadyWrapped = 'code' in bodyObject && 'errMsg' in bodyObject && 'data' in bodyObject

  let code: number
  let errMsg: string
  let data: unknown

  if (alreadyWrapped) {
    code = typeof bodyObject.code === 'number' ? bodyObject.code : status
    errMsg = typeof bodyObject.errMsg === 'string' ? bodyObject.errMsg : ''
    data = bodyObject.data ?? {}
  } else {
    code = status
    if (isSuccess) {
      errMsg = ''
      data = rawBody ?? {}
    } else {
      const message = typeof (bodyObject.message) === 'string' ? bodyObject.message : ''
      errMsg = message
      data = {}
    }
  }

  const headers = new Headers(originalResponse.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')

  c.res = new Response(
    JSON.stringify({ code, errMsg, data }),
    {
      status,
      headers,
    },
  )
}
