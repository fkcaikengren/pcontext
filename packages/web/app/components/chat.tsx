import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { useEffect, useMemo, useRef, useState, type UIEvent, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowDown, StopCircle, Plus, FileText, Loader2, Wrench, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

import 'katex/dist/katex.min.css'
import 'streamdown/styles.css'



interface ChatProps {
  libraryName: string
}

export function Chat({ libraryName }: ChatProps) {
  const [chatKey, setChatKey] = useState(0)
  const libraryNameRef = useRef(libraryName)
  libraryNameRef.current = libraryName

  const transport = useMemo(() => {
    const baseUrl = import.meta.env.VITE_BASE_URL || ''
    return new DefaultChatTransport({
      api: `${baseUrl}/api/chat`,
      credentials: 'include',
      get body() {
        return { libraryName: libraryNameRef.current }
      },
    }) as any
  }, [])

  const { messages, sendMessage, stop, status } = useChat({
    transport,
    id: chatKey.toString(),
  })
  const isLoading = status === 'streaming' || status === 'submitted'


  const [input, setInput] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())

  const viewMessages = useMemo(() => {
    // console.log('Raw messages from useChat -> ', messages)
    return messages
      .map((m) => {
        const textParts = (m.parts ?? [])
          .map((p) => (p.type === 'text' ? p.text : ''))
          .join('')
          .trim()


        // 提取 toolInvocations
        // 根据 UIMessage 定义，工具调用部分的 type 是 'tool-${TOOL_NAME}' 格式
        const toolInvocations = (m.parts ?? [])
          .filter((p) => p.type.startsWith('tool-'))
          .map((part) => {
            // 从 type 中提取工具名称，如 'tool-myFunction' -> 'myFunction'
            const toolName = part.type.replace(/^tool-/, '')
            return {
              toolCallId: part.toolCallId,
              toolName,
              input: part.input,
              output: part.output,
              state: part.state,
              errorText: part.errorText,
            }
          })

        return {
          id: m.id,
          role: m.role,
          content: textParts,
          toolInvocations,
        }
      })
      .filter((m) => m.content.length > 0 || m.toolInvocations.length > 0)
  }, [messages])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [viewMessages, isLoading])

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isAtBottom)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const toggleToolExpanded = (toolCallId: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev)
      if (next.has(toolCallId)) {
        next.delete(toolCallId)
      } else {
        next.add(toolCallId)
      }
      return next
    })
  }

  const handleNewChat = () => {
    setChatKey((k) => k + 1)
  }

  return (
    <div key={chatKey} className="flex flex-col h-[600px] relative border rounded-lg bg-background">
      <div className="flex items-center justify-between p-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewChat}
          disabled={viewMessages.length === 0 || isLoading}
        >
          <Plus className="h-4 w-4 mr-1" />
          新建对话
        </Button>
      </div>
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {viewMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>开始对话</p>
          </div>
        )}
        
        {viewMessages.map((m) => (
          <Fragment key={m.id}>
            {/* 工具调用展示 - 独立消息块 */}
            {m.toolInvocations.length > 0 && m.toolInvocations.map((tool) => {
              const isExpanded = expandedTools.has(tool.toolCallId)
              const hasContent = tool.state === 'output-available' && tool.output
              return (
                <div key={tool.toolCallId} className="flex w-full justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm bg-muted text-foreground border-l-2 border-primary">
                    <div
                      className="flex items-center gap-1 text-primary font-medium cursor-pointer"
                      onClick={() => toggleToolExpanded(tool.toolCallId)}
                    >
                      {hasContent ? (
                        isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                      ) : (
                        <Wrench className="h-3 w-3" />
                      )}
                      <span>{tool.toolName}</span>
                      {tool.input && typeof tool.input === 'object' && 'query' in tool.input && (
                        <span className="text-muted-foreground font-normal ml-1">
                          - {String(tool.input.query)}
                        </span>
                      )}
                      <span className="text-muted-foreground font-normal">
                        {tool.state === 'output-available' ? ' ✓' : tool.state === 'output-error' ? ' ✗' : '...'}
                      </span>
                    </div>
                    {isExpanded && hasContent && (
                      <div className="mt-1 ml-4 text-muted-foreground max-h-[220px] overflow-y-auto">
                        <Streamdown plugins={{ code, math }}>
                          {typeof tool.output === 'object' && tool.output !== null && 'content' in tool.output
                            ? tool.output.content
                            : String(tool.output)}
                        </Streamdown>
                      </div>
                    )}
                    {tool.state === 'output-error' && tool.errorText && (
                      <div className="mt-1 ml-4 text-destructive">
                        {tool.errorText}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {/* 文本内容 - 独立消息块 */}
            {m.content && (
              <div className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-lg px-4 py-2 text-sm", m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                  <Streamdown plugins={{ code, math }}>
                    {m.content}
                  </Streamdown>
                </div>
              </div>
            )}
          </Fragment>
        ))}
        
        {isLoading && viewMessages[viewMessages.length - 1]?.role === 'user' && (
           <div className="flex justify-start">
             <div className="bg-muted text-foreground max-w-[80%] rounded-lg px-4 py-2 text-sm">
               <span className="animate-pulse">Thinking...</span>
             </div>
           </div>
        )}


        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-20 right-4 rounded-full shadow-md z-10 opacity-80 hover:opacity-100 transition-opacity"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      <div className="p-4 border-t bg-background sticky bottom-0 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const text = input.trim()
            if (!text || isLoading) return
            setInput('')
            sendMessage({ text })
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button 
              type="button" 
              variant="destructive" 
              size="icon"
              onClick={() => stop()}
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}
