import { chatHandler } from '@/modules/doc/chat.service'
import { createRouter } from '@/shared/create-app'

const router = createRouter()
  .post('/', chatHandler)

export default router
