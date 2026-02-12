import { createRouter } from '../lib/create-app'

const router = createRouter()
  .get('/', (c) => {
    return c.json({
      message: 'Hello Pcontext!',
    })
  })

export default router
