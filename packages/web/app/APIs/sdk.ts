import { client } from './client'

import type { ClientResponse } from 'hono/client'

// 定义错误处理
// 可能网络错误，抛出一个Error('network error')
// 如果status/code 在300之外，视为不成功，抛出错误 Error(message)

type JsonResponse = ClientResponse<any, number, 'json'>

type SuccessResponse<R extends JsonResponse> = R extends ClientResponse<
  any,
  infer S,
  'json'
>
  ? `${S}` extends `2${string}`
    ? R
    : never
  : never

type SuccessBody<R extends JsonResponse> = SuccessResponse<R> extends ClientResponse<
  infer T,
  any,
  any
>
  ? T
  : never

type SuccessData<R extends JsonResponse> = SuccessBody<R> extends { data?: infer D }
  ? D
  : never

export async function parseRes<R extends JsonResponse>(
  response: Promise<R>
): Promise<SuccessData<R>> {
  let res: R
  try {
    res = await response
  } catch (cause) {
    throw new Error('network error', { cause })
  }

  if (res.status >= 200 && res.status < 300) {
    if (res.status === 204) {
      return undefined as SuccessData<R>
    }

    const body = await res.json()
    return body.data
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = undefined
  }

  const message =
    typeof (body as any)?.message === 'string' && (body as any).message.length > 0
      ? (body as any).message
      : `Request failed with status ${res.status}`

  const error = new Error(message)
  ;(error as any).status = res.status
  ;(error as any).body = body
  throw error
}

// export async function healthDetailGet() {
//   const response =  client.health.detailed.$get()
//   const data = await parseRes(response)
// }

// export async function docsSlugGet(slug: string) {
//   try {
//     const data = await parseRes(client.docs[':slug'].$get({ param: { slug } }))
//   } catch (error) {
//     console.log(error)
//   }
//   // const data = await res.json()
//   // return data
// }
