
import { getCookie } from '@/utils/cookie'
import { createClient } from '@pcontext/api/client'

// 动态获取 API 基础 URL
// 生产环境自动使用同域名，开发环境可通过 VITE_BASE_URL 指定
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_BASE_URL) {
    return `${import.meta.env.VITE_BASE_URL}/api`
  }
  // 生产环境使用同域名的相对路径
  return '/api'
}

const apiBaseUrl = getApiBaseUrl()


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
