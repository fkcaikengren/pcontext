import type { UIMessage } from 'ai'
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai'
import { createRouter } from '@/shared/create-app'
import { convertUIMessagesToLlamaIndex } from './infrastructure/agent/engine/message-convert'
import { createTwoStageRAGWorkflow, queryTwoStageRAG, rerankCompleteEvent, retrievalCompleteEvent, streamingResponseEvent } from './infrastructure/agent/engine/workflow'
import { getIndex } from './infrastructure/agent/storage'

// const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const router = createRouter()
  .post('/', async (c) => {
    const body = await c.req.json()
    const { messages }: { messages: UIMessage[], libraryName?: string } = body

    const chatMessages = convertUIMessagesToLlamaIndex(messages)
    // 获取最后一条用户消息作为 query
    const lastUserMessage = chatMessages.filter(m => m.role === 'user').pop()

    const query = typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : lastUserMessage?.content.join('\n') || ''
    const stream = createUIMessageStream<UIMessage>({
      execute: async ({ writer }) => {
        // 执行两阶段 RAG 查询
        const index = await getIndex()
        const workflow = createTwoStageRAGWorkflow(index)

        writer.write({
          type: 'start',
          messageId: 'msg-1',
        })
        // 遵循 vercel ai sdk的Data Stream Protocol, 保证事件的顺序正确
        const eventStream = await queryTwoStageRAG(workflow, query)
        // 遍历 workflow 事件，将 streamingResponseEvent 的 delta 发送出去

        for await (const event of eventStream) {
          if (streamingResponseEvent.include(event)) {
            const { isFirst, delta, isLast } = event.data

            if (isFirst) {
              writer.write({
                type: 'text-start',
                id: 'msg-1',
              })
            }
            else if (isLast) {
              // 如果是最后一个事件，发送 text-end
              writer.write({
                type: 'text-end',
                id: 'msg-1',
              })
            }
            else {
              // 发送 text-delta
              writer.write({
                type: 'text-delta',
                delta,
                id: 'msg-1',
              })
            }
          }

          if (retrievalCompleteEvent.include(event)) {
            writer.write({
              type: 'tool-input-start',
              toolCallId: 'call_fJdQDqnXeGxTmr4E3YPSR7Ar',
              toolName: 'query Docs',
            })
            writer.write({
              type: 'tool-input-delta',
              toolCallId: 'call_fJdQDqnXeGxTmr4E3YPSR7Ar',
              inputTextDelta: query,
            })
            writer.write(
              { type: 'tool-input-available', toolCallId: 'call_fJdQDqnXeGxTmr4E3YPSR7Ar', toolName: 'query Docs', input: { query } },
            )
          }

          if (rerankCompleteEvent.include(event)) {
            const { nodes } = event.data

            // 注意：tool-output-available 不应该有 id 字段
            writer.write({
              type: 'tool-output-available',
              toolCallId: 'call_fJdQDqnXeGxTmr4E3YPSR7Ar',
              output: {
                content: nodes.map(node => node.node.getContent()).join('\n\n'),
              },
            })
          }
        }
        // TODO：finish事件前端没有收到
        writer.write({ type: 'finish', finishReason: 'stop' })
      },
    })

    return createUIMessageStreamResponse({ stream })
  })

export default router
