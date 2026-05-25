'use client'

import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, X, Wifi, WifiOff } from 'lucide-react'
import { io, type Socket } from 'socket.io-client'
import { ensureChatSession, type StoredSession } from '@/lib/chat-session'
import { apiFetch } from '@/lib/api'
import { SOCKET_EVENTS, type Message } from '@critical/shared'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000'

type ConnectStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<StoredSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<ConnectStatus>('idle')
  const [adminTyping, setAdminTyping] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize session and socket on first open
  useEffect(() => {
    if (!open || socketRef.current) return

    let cancelled = false
    setStatus('connecting')

    ;(async () => {
      try {
        const sess = await ensureChatSession()
        if (cancelled) return
        setSession(sess)

        // Fetch history
        try {
          const { messages: history } = await apiFetch<{ messages: Message[] }>(
            `/api/chat/history?token=${encodeURIComponent(sess.sessionToken)}`,
          )
          if (!cancelled) setMessages(history)
        } catch {
          // No history yet — that's fine
        }

        // Connect socket
        const socket = io(BACKEND_URL, {
          auth: { sessionToken: sess.sessionToken },
          transports: ['websocket', 'polling'],
        })
        socketRef.current = socket

        socket.on('connect', () => setStatus('connected'))
        socket.on('disconnect', () => setStatus('disconnected'))
        socket.on('connect_error', () => setStatus('error'))

        socket.on(SOCKET_EVENTS.MESSAGE, (msg: Message) => {
          setMessages((prev) => [...prev, msg])
          if (msg.sender === 'admin') {
            setAdminTyping(false)
            if (!open) setUnreadCount((c) => c + 1)
          }
        })

        socket.on(SOCKET_EVENTS.TYPING, (broadcast: { from: string; isTyping: boolean }) => {
          if (broadcast.from === 'admin') {
            setAdminTyping(broadcast.isTyping)
          }
        })
      } catch (err) {
        console.error('Chat session init failed:', err)
        if (!cancelled) setStatus('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  // Auto scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, adminTyping])

  // Clear unread when opening
  useEffect(() => {
    if (open) setUnreadCount(0)
  }, [open])

  const sendMessage = useCallback(() => {
    const content = input.trim()
    if (!content || !socketRef.current || !session) return
    socketRef.current.emit(SOCKET_EVENTS.VISITOR_MESSAGE, {
      sessionId: session.sessionId,
      content,
    })
    setInput('')
  }, [input, session])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleTyping() {
    if (!socketRef.current || !session) return
    socketRef.current.emit(SOCKET_EVENTS.VISITOR_TYPING, {
      sessionId: session.sessionId,
      isTyping: true,
    })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit(SOCKET_EVENTS.VISITOR_TYPING, {
        sessionId: session.sessionId,
        isTyping: false,
      })
    }, 2000)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? '关闭客服聊天' : '打开客服聊天'}
        aria-expanded={open}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-dark-700 text-white'
            : 'bg-primary text-dark-900 hover:scale-110 hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]'
        }`}
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[32rem] max-h-[calc(100vh-8rem)] flex flex-col glass-card overflow-hidden shadow-2xl"
            role="dialog"
            aria-label="客服聊天窗口"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-800/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                  <span className="text-primary text-xs font-bold">C</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Critical 客服</p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    {status === 'connected' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        在线
                      </>
                    ) : status === 'connecting' ? (
                      <>
                        <Wifi className="w-2.5 h-2.5 animate-pulse" />
                        连接中
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-2.5 h-2.5" />
                        离线
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && status === 'connected' && (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-1">欢迎来到 Critical</p>
                  <p className="text-xs text-gray-500">有任何问题？随时告诉我们</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble
                  key={(msg._id as string) ?? i}
                  message={msg}
                  isVisitor={msg.sender === 'visitor'}
                />
              ))}

              {adminTyping && (
                <div className="flex items-center gap-2 px-3 py-2 max-w-fit rounded-2xl rounded-bl-sm bg-dark-700/50 border border-white/5">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-dark-800/30">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    handleTyping()
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={status === 'connected' ? '输入消息... (Enter 发送)' : '正在连接...'}
                  disabled={status !== 'connected'}
                  rows={1}
                  maxLength={2000}
                  className="flex-1 px-3 py-2 rounded-lg bg-dark-700/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50 resize-none max-h-32"
                  aria-label="消息输入框"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || status !== 'connected'}
                  className="w-9 h-9 rounded-lg bg-primary text-dark-900 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-primary-light flex-shrink-0"
                  aria-label="发送消息"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-2 text-center">我们的客服会尽快回复您</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function MessageBubble({ message, isVisitor }: { message: Message; isVisitor: boolean }) {
  const time = message.createdAt
    ? new Date(message.createdAt as string | Date).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[75%]">
        <div
          className={`px-3 py-2 text-sm break-words whitespace-pre-wrap ${
            isVisitor
              ? 'rounded-2xl rounded-br-sm bg-primary text-dark-900'
              : 'rounded-2xl rounded-bl-sm bg-dark-700/50 border border-white/5 text-white'
          }`}
        >
          {message.content}
        </div>
        <p
          className={`text-[10px] text-gray-600 mt-1 px-1 ${
            isVisitor ? 'text-right' : 'text-left'
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  )
}
