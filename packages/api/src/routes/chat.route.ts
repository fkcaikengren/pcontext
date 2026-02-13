import { createRouter } from '../lib/create-app'
import { chatHandler } from '@/services/chat.service'

const router = createRouter()
  .post('/', chatHandler)

export default router
