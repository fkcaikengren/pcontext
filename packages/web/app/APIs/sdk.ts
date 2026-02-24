import { client } from './client'

import type { ClientResponse } from 'hono/client'

export class HttpError extends Error {
  constructor(
    message: string,
    public code: number,
    public data: Record<string, any> | null = null
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

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
   

    const body = await res.json()
    return body.data
  }

  let body: {code: number; data?: any;}
  try {
    body = await res.json()
  } catch {
    body = {code: 40000}
  }

  const message =
    typeof (body as any)?.message === 'string' && (body as any).message.length > 0
      ? (body as any).message
      : `Request failed with status ${res.status}`

  throw new HttpError(message, body.code, body.data)
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
