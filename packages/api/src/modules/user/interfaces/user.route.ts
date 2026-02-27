import type { UserLoginDTO } from '@/modules/user/interfaces/user.dto'
import { randomUUID } from 'node:crypto'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { getUserById, login } from '@/modules/user/application/user.service'
import { userLoginSchema } from '@/modules/user/interfaces/user.dto'
import AppSettings from '@/settings'
import { createRouter } from '@/shared/create-app'
import { getCurrentUserId } from '@/shared/utils/user'
import { jsonValidator } from '@/shared/utils/validator'

const { config } = AppSettings

const router = createRouter()
  .post('/login', jsonValidator(userLoginSchema), async (c) => {
    const { username, password } = c.req.valid('json') as UserLoginDTO
    const { user, token } = await login({ username, password })

    const csrfToken = randomUUID()

    // token 有效期 1天
    setCookie(c, 'access_token', token, {
      httpOnly: true,
      secure: !config.is_dev,
      sameSite: 'Strict',
      path: '/',
      maxAge: 86400,
    })

    setCookie(c, 'csrf_token', csrfToken, {
      httpOnly: false,
      secure: !config.is_dev,
      sameSite: 'Strict',
      path: '/',
      maxAge: 86400,
    })

    return c.json(user)
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
    if (!userId)
      return c.json({ message: '用户未登录' }, 401)

    const user = await getUserById(userId)
    if (!user)
      return c.json({ message: '用户不存在' }, 404)

    return c.json(user)
  })

export default router
