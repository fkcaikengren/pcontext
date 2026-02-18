import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowDown, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

import 'katex/dist/katex.min.css'
import 'streamdown/styles.css'

interface ChatProps {
  libraryName: string
}

export function Chat({ libraryName }: ChatProps) {
  const transport = useMemo(() => {
    const baseUrl = import.meta.env.VITE_BASE_URL || ''
    return new DefaultChatTransport({
      api: `${baseUrl}/api/chat`,
      credentials: 'include',
      body: { libraryName },
    }) as any
  }, [libraryName])

  const { messages, sendMessage, stop, status } = useChat({ transport })
  const isLoading = status === 'streaming' || status === 'submitted'

  const [input, setInput] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const viewMessages = useMemo(() => {
    return messages
      .map((m) => {
        const content = (m.parts ?? [])
          .map((p) => (p.type === 'text' ? p.text : ''))
          .join('')
          .trim()

        return {
          id: m.id,
          role: m.role,
          content,
        }
      })
      .filter((m) => m.content.length > 0)
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

  return (
    <div className="flex flex-col h-[600px] relative border rounded-lg bg-background">
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {viewMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>根据 {libraryName} 文档进行对话</p>
          </div>
        )}
        
        {viewMessages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex w-full",
              m.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                m.role === 'user' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-foreground"
              )}
            >
              <Streamdown plugins={{ code, math }}>
                {m.content}
              </Streamdown>
            </div>
          </div>
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
