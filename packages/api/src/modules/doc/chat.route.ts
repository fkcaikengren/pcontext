import { createRouter } from '@/shared/create-app'
import { UIMessage } from 'ai'
import { toUIMessageStream } from '@ai-sdk/llamaindex'
import { createUIMessageStreamResponse } from 'ai'

const router = createRouter()
  .post('/', async (c)=>{

  const body = await c.req.json()
    const { messages,  libraryName }: { messages: UIMessage[],  libraryName?: string } = body
    
    const stream = await c.var.chatService.chat(messages, libraryName)

    return createUIMessageStreamResponse({
      status: 200,
      statusText: 'OK',
      headers: {
        'Custom-Header': 'value',
      },
      // @ts-expect-error
      stream: toUIMessageStream(stream),
    })

  })

export default router
