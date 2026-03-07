import type { FileUIPart, ReasoningUIPart, SourceDocumentUIPart, SourceUrlUIPart, TextUIPart, UIMessage } from 'ai'
import type { ChatMessage } from 'llamaindex'

/**
 * 将 UIMessage 的各种 part 类型转换为文本描述
 */
function convertPartToText(part: UIMessage['parts'][number]): string {
  switch (part.type) {
    case 'text':
      return (part as TextUIPart).text
    case 'reasoning':
      return (part as ReasoningUIPart).text
    case 'tool-invocation': {
      // 处理工具调用部分
      const toolInvocations = (part as any).toolInvocations || []
      return toolInvocations.map((invocation: any) => {
        if (invocation.state === 'output-available') {
          return `[Tool: ${invocation.toolName}] ${JSON.stringify(invocation.output)}`
        }
        return `[Tool: ${invocation.toolName}] input: ${JSON.stringify(invocation.input)}`
      }).join('\n')
    }
    case 'file': {
      const file = part as FileUIPart
      return `[File: ${file.filename || 'unknown'}] ${file.url}`
    }
    case 'source-url': {
      const sourceUrl = part as SourceUrlUIPart
      return `[Source: ${sourceUrl.title || sourceUrl.url}] ${sourceUrl.url}`
    }
    case 'source-document': {
      const sourceDoc = part as SourceDocumentUIPart
      return `[Document: ${sourceDoc.title}] ${sourceDoc.filename || ''}`
    }
    case 'step-start':
      return ''
    default:
      return ''
  }
}

export function convertUIMessageToLlamaIndex(message: UIMessage): ChatMessage {
  const content = (message.parts ?? [])
    .map(convertPartToText)
    .filter(Boolean)
    .join('\n')

  return {
    role: message.role,
    content,
  }
}

// 批量转换
export function convertUIMessagesToLlamaIndex(messages: UIMessage[]): ChatMessage[] {
  return messages.map(convertUIMessageToLlamaIndex)
}
