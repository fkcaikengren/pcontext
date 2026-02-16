import type { UIMessage } from 'ai'
import type { Handler } from 'hono'
import type { ChatMessage } from 'llamaindex'
import { toUIMessageStream } from '@ai-sdk/llamaindex'
import { createUIMessageStreamResponse } from 'ai'
import { createChatEngine } from '@/modules/doc/infrastructure/agent/engine/chat'

export const chatHandler: Handler = async (c) => {
  try {
    const body = await c.req.json()
    const { messages, data, libraryName }: { messages: UIMessage[], data?: any, libraryName?: string } = body
    const userMessage = messages.pop()
    if (!messages || !userMessage || userMessage.role !== 'user') {
      return c.json(
        {
          error:
            'messages are required in the request body and the last message must be from the user',
        },
        400,
      )
    }

    const ids: string[] = libraryName ? [libraryName] : []
    const chatEngine = await createChatEngine(ids, data)

    const userText = (userMessage.parts ?? [])
      .map(p => (p.type === 'text' ? (p as any).text : ''))
      .join('')

    const stream = await chatEngine.chat({
      message: userText,
      chatHistory: messages.map(m => ({
        role: m.role as ChatMessage['role'],
        content: (m.parts ?? [])
          .map(p => (p.type === 'text' ? (p as any).text : ''))
          .join('') ?? '',
      })) as ChatMessage[],
      stream: true,
    })

    // Using a custom async generator to inspect/fix chunks
    async function* fixStream() {
      for await (const chunk of stream) {
        // Ensure delta exists
        if (chunk.delta === undefined && (chunk as any).response) {
          // Some versions use 'response' for the delta
          yield { ...chunk, delta: (chunk as any).response }
        }
        else {
          yield chunk
        }
      }
    }

    return createUIMessageStreamResponse({
      stream: toUIMessageStream(fixStream()),
    })
  }
  catch (error) {
    console.error('[LlamaIndex]', error)
    return c.json({ detail: (error as Error).message }, 500)
  }
}
