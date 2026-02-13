import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { randomUUID } from 'node:crypto'
import { userLoginSchema, type UserLoginDTO } from '@/modules/user/user.dto'
import { createRouter } from '@/shared/create-app'
import { getCurrentUserId } from '@/shared/utils/user'
import { getUserById, login } from '@/modules/user/user.service'
import { jsonValidator } from '@/shared/utils/validator'
import AppSettings from '@/settings'

const { config } = AppSettings

const router = createRouter()
  .post('/login', jsonValidator(userLoginSchema), async (c) => {
    const { username, password } = c.req.valid('json') as UserLoginDTO
    try {
      const { user, token } = await login({ username, password })

      const csrfToken = randomUUID()

      setCookie(c, 'access_token', token, {
        httpOnly: true,
        secure: !config.is_dev,
        sameSite: 'Strict',
        path: '/',
        maxAge: 3600,
      })

      setCookie(c, 'csrf_token', csrfToken, {
        httpOnly: false,
        secure: !config.is_dev,
        sameSite: 'Strict',
        path: '/',
        maxAge: 3600,
      })

      return c.json(user)
    } catch (e: any) {
      return c.json({ message: e.message }, 401)
    }
  })
  .post('/logout', async (c) => {
    const csrfToken = getCookie(c, 'csrf_token')

    deleteCookie(c, 'access_token', { path: '/' })
    deleteCookie(c, 'csrf_token', { path: '/' })

    return c.json({ message: 'logout success', csrfToken })
  })
  .get('/me', async (c) => {
    const userId = getCurrentUserId(c)
    const routes: any = {
      '/': true,
      '/login': true,
      '/profile': true,

      '/docs': true,
      '/docs/*': true,
      '/add-docs': true,

      '/tasks': true,
      '/tasks/*': true,

      '/users': true,
      '/permissions': true,

      '/pcontext-setting': true,
    }
    let me: any = null
    if (userId) {
      const user = await getUserById(userId)
      if (user) {
        me = {
          id: user.id,
          name: user.name,
          role: user.role,
          permissions: { routes },
        }
      }
    }

    me = me || {
      id: null,
      name: null,
      role: 'guest',
      permissions: {
        routes: {
          ...routes,
          '/users': false,
          '/permissions': false,
        },
      },
    }

    return c.json(me)
  })
  .get('/profile', async (c) => {
    const userId = getCurrentUserId(c)
    if (!userId) return c.json({ message: '用户未登录' }, 401)

    const user = await getUserById(userId)
    if (!user) return c.json({ message: '用户不存在' }, 404)

    return c.json(user)
  })

export default router
