import type { UIMessage } from 'ai'
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from 'ai'
import { createRouter } from '@/shared/create-app'
import { convertUIMessagesToLlamaIndex } from './infrastructure/agent/engine/message-convert'
import { createTwoStageRAGWorkflow, queryTwoStageRAG, rerankCompleteEvent, retrievalCompleteEvent, streamingResponseEvent } from './infrastructure/agent/engine/workflow'
import { getIndex } from './infrastructure/agent/storage'

// const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const router = createRouter()
  .post('/', async (c) => {
    const body = await c.req.json()
    const { messages, libraryName }: { messages: UIMessage[], libraryName?: string } = body
    const abortSignal = c.req.raw.signal

    const chatMessages = convertUIMessagesToLlamaIndex(messages)
    // 获取最后一条用户消息作为 query
    const lastUserMessage = chatMessages.filter(m => m.role === 'user').pop()

    const query = typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : lastUserMessage?.content.join('\n') || ''
    const stream = createUIMessageStream<UIMessage>({
      execute: async ({ writer }) => {
        // 动态生成 messageId
        const messageId = generateId()

        // 监听客户端中止信号
        const handleAbort = () => {
          console.log('[chat] Client aborted the request')
        }
        abortSignal.addEventListener('abort', handleAbort)

        try {
          // 如果已经中止，直接退出
          if (abortSignal.aborted) {
            return
          }

          // 执行两阶段 RAG 查询
          const index = await getIndex()
          const workflow = createTwoStageRAGWorkflow(index)

          writer.write({
            type: 'start',
            messageId,
          })

          // 生成唯一的 toolCallId
          const toolCallId = generateId()

          // 遵循 vercel ai sdk的Data Stream Protocol, 保证事件的顺序正确
          const eventStream = await queryTwoStageRAG(workflow, query, libraryName ? [libraryName] : [])
          // 遍历 workflow 事件，将 streamingResponseEvent 的 delta 发送出去

          for await (const event of eventStream) {
            // 检查是否已中止，如果是则停止处理更多事件
            if (abortSignal.aborted) {
              console.log('[chat] Request aborted, stopping stream')
              break
            }

            if (streamingResponseEvent.include(event)) {
              const { isFirst, delta, isLast } = event.data

              if (isFirst) {
                writer.write({
                  type: 'text-start',
                  id: messageId,
                })
              }
              else if (isLast) {
                // 如果是最后一个事件，发送 text-end
                writer.write({
                  type: 'text-end',
                  id: messageId,
                })
                writer.write({ type: 'finish', finishReason: 'stop' })
                // TODO：原因检查
                // type: 'finish' 无法终止，write一个字符串可以强行终止流
                // @ts-expect-error
                writer.write('[DONE]')
              }
              else {
                // 发送 text-delta
                writer.write({
                  type: 'text-delta',
                  delta,
                  id: messageId,
                })
              }
            }

            if (retrievalCompleteEvent.include(event)) {
              writer.write({
                type: 'tool-input-start',
                toolCallId,
                toolName: 'query Docs',
              })
              writer.write({
                type: 'tool-input-delta',
                toolCallId,
                inputTextDelta: query,
              })
              writer.write(
                { type: 'tool-input-available', toolCallId, toolName: 'query Docs', input: { query } },
              )
            }

            if (rerankCompleteEvent.include(event)) {
              const { nodes } = event.data

              // 注意：tool-output-available 不应该有 id 字段
              writer.write({
                type: 'tool-output-available',
                toolCallId,
                output: {
                  content: nodes.map(node => node.node.getContent()).join('\n\n'),
                },
              })
            }
          }
        }
        finally {
          abortSignal.removeEventListener('abort', handleAbort)
        }
      },
      onFinish: ({ _messages, finishReason }) => {
        console.log('Stream finished:', finishReason)
      },
    })

    return createUIMessageStreamResponse({ stream })
  })

export default router
