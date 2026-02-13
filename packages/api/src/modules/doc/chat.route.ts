import { createRouter } from '@/shared/create-app'
import { chatHandler } from '@/modules/doc/chat.service'

const router = createRouter()
  .post('/', chatHandler)

export default router
