
import { getCookie } from '~/utils/cookie'
import { createClient } from '@pcontext/api/client'

const baseUrl = import.meta.env.VITE_BASE_URL || ''
const apiBaseUrl = `${baseUrl}/api`


// function isJsonContentType(contentType: string) {
//   return contentType === 'application/json' || contentType.endsWith('+json')
// }

// async function parseResponseBody(response: Response) {
//   const contentType = response.headers.get('content-type') || ''

//   if (isJsonContentType(contentType)) {
//     return await response.json()
//   }

//   const text = await response.text()
//   return { code: 200, data: text }
// }


export const client = createClient(apiBaseUrl, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    // 拦截请求
    const method = (init?.method || 'GET').toUpperCase()
    const headers = new Headers(init?.headers)

    if (typeof window !== 'undefined') {
      // CSRF 预防
      const safeMethods = ['GET', 'HEAD', 'OPTIONS']
      if (!safeMethods.includes(method)) {
        const csrfToken = getCookie('csrf_token')
        if (csrfToken && !headers.has('X-CSRF-Token')) {
          headers.set('X-CSRF-Token', csrfToken)
        }
      }
    }

    return fetch(input, {
      ...init,
      headers,
      credentials: 'include',
    })
  },
}) 
