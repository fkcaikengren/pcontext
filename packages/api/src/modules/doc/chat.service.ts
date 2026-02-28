import type { UIMessage } from 'ai'
import { MetadataMode } from 'llamaindex'
import { createChatEngine } from '@/modules/doc/infrastructure/agent/engine/chat'
import { getServiceDeps } from '@/shared/deps'
import { logger } from '@/shared/logger'


export class ChatService {


  async chat(messages: UIMessage[], libraryName?: string) {
    const userMessage = messages.pop()
    if (!messages || !userMessage || userMessage.role !== 'user') {
      throw new Error('messages are required in the request body and the last message must be from the user')
    }
    if (libraryName) {
      const { rankService } = getServiceDeps()
      rankService.incrementDocScore(libraryName, 2)
    }

    const ids: string[] = libraryName ? [libraryName] : []
    const {chatEngine, retriever} = await createChatEngine(ids)

    const userText = (userMessage.parts ?? [])
      .map(p => (p.type === 'text' ? (p as any).text : ''))
      .join('')
    // console.log('用户输入: %s', userText)
    // 打印 retriever 中间结果
    // const retrievedNodes = await retriever.retrieve(userText)
    // console.log('===== Retriever 中间结果 =====')
    // console.log(`搜索到的节点数量: ${retrievedNodes.length}`)
    // retrievedNodes.forEach((node, index) => {
    //   console.log(`\n--- 节点 ${index + 1} ---`)
    //   console.log('ID:', node.node.id_)
    //   console.log('分数:', node.score)
    //   console.log('内容摘要:', node.node.getContent(MetadataMode.NONE).slice(0, 400) + '...')
    // })
    // console.log('=============================')

    const stream = await chatEngine.chat({
      message: userText,
      chatHistory: messages.slice(-10).map(m => ({
        role: m.role ,
        content: (m.parts ?? [])
          .map(p => (p.type === 'text' ? (p as any).text : ''))
          .join('') ?? '',
      })),
      stream: true,
    })

    // 调试：打印流式响应内容
    // logger.info('===== LLM 流式响应开始 =====')
    // let chunkCount = 0
    // const originalIterator = stream[Symbol.asyncIterator]()
    // const debugStream = {
    //   [Symbol.asyncIterator]() {
    //     return {
    //       async next() {
    //         const result = await originalIterator.next()
    //         chunkCount++
    //         const value = result.value
    //         logger.info(`Chunk ${chunkCount}: ${JSON.stringify(value)}`)
    //         return result
    //       }
    //     }
    //   }
    // }
    // return debugStream;
    return stream
  }
}
