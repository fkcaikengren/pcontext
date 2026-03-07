import type { UIMessage } from 'ai'
import { createChatEngine } from '@/modules/doc/infrastructure/agent/engine/chat'
import { convertUIMessagesToLlamaIndex, convertUIMessageToLlamaIndex } from '@/modules/doc/infrastructure/agent/engine/message-convert'
import { getServiceDeps } from '@/shared/deps'

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
    const { agent } = await createChatEngine(ids)

    // 提取用户消息文本
    const inputMessage = convertUIMessageToLlamaIndex(userMessage)
    console.log('用户输入: %s', inputMessage.content)

    // 使用转换工具转换历史消息
    const chatMessages = convertUIMessagesToLlamaIndex(messages.slice(-10))

    const stream = agent.runStream(inputMessage.content, {
      chatHistory: chatMessages,
    })
    // console.log('Agent response stream created')
    // console.log(stream)

    return stream
  }
}
