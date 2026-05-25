'use client'

import { useEffect, useState, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, MessageCircle } from 'lucide-react'
import { io, type Socket } from 'socket.io-client'
import { useAuth, authFetch } from '@/lib/auth-context'
import { SOCKET_EVENTS, type Message } from '@critical/shared'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000'

interface SessionRow {
  sessionId: string
  status: 'open' | 'closed'
  visitorInfo?: { name?: string; email?: string }
  lastMessage?: string
  lastMessageAt?: string
  unreadCount?: number
  createdAt?: string
}

export default function AdminChatPage() {
  const router = useRouter()
  const { user, accessToken, loading: authLoading, refresh } = useAuth()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/admin/login')
    }
  }, [authLoading, user, router])

  // Connect socket
  useEffect(() => {
    if (!user || !accessToken) return
    const socket = io(BACKEND_URL, {
      auth: { adminToken: accessToken },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, (msg: Message) => {
      // Update active session messages
      if (msg.sessionId === activeSessionId) {
        setMessages((prev) => [...prev, msg])
      }
      // Bump session list
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.sessionId === msg.sessionId)
        if (idx === -1) {
          // New session
          return [
            {
              sessionId: msg.sessionId,
              status: 'open',
              lastMessage: msg.content,
              lastMessageAt: msg.createdAt as string,
              unreadCount: msg.sender === 'visitor' ? 1 : 0,
              visitorInfo: msg.visitorInfo,
            },
            ...prev,
          ]
        }
        const updated = [...prev]
        updated[idx] = {
          ...updated[idx],
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt as string,
          unreadCount:
            msg.sender === 'visitor' && msg.sessionId !== activeSessionId
              ? (updated[idx].unreadCount ?? 0) + 1
              : updated[idx].unreadCount,
        }
        // Move to top
        const [item] = updated.splice(idx, 1)
        return [item, ...updated]
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, accessToken, activeSessionId])

  // Fetch sessions
  useEffect(() => {
    if (!user) return
    authFetch<SessionRow[]>('/api/chat/admin/sessions', {}, { accessToken, refresh })
      .then((data) => {
        setSessions(data)
        setLoading(false)
        setSessionsLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
        setSessionsLoading(false)
      })
  }, [user, accessToken, refresh])

  // Fetch messages when active session changes
  useEffect(() => {
    if (!activeSessionId || !user) return
    authFetch<{ messages: Message[] }>(
      `/api/chat/admin/sessions/${activeSessionId}/messages`,
      {},
      { accessToken, refresh },
    )
      .then((data) => {
        setMessages(data.messages)
        // Mark as read
        socketRef.current?.emit(SOCKET_EVENTS.ADMIN_READ, { sessionId: activeSessionId })
        // Reset unread in session list
        setSessions((prev) =>
          prev.map((s) => (s.sessionId === activeSessionId ? { ...s, unreadCount: 0 } : s)),
        )
      })
      .catch(console.error)
  }, [activeSessionId, user, accessToken, refresh])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(() => {
    const content = input.trim()
    if (!content || !socketRef.current || !activeSessionId) return
    socketRef.current.emit(SOCKET_EVENTS.ADMIN_MESSAGE, {
      sessionId: activeSessionId,
      content,
    })
    setInput('')
  }, [input, activeSessionId])

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId)

  return (
    <main className="min-h-screen bg-dark-900 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-semibold">实时客服</h1>
          <span className="text-xs text-gray-500">{sessions.length} 个会话</span>
        </div>
      </header>

      {/* Two-pane layout */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto">
        {/* Sessions list */}
        <aside className="w-72 lg:w-80 border-r border-white/5 overflow-y-auto bg-dark-900">
          {sessionsLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm">加载中...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无会话</p>
              <p className="text-xs text-gray-600 mt-1">访客通过网站客服图标发起聊天</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {sessions.map((s) => {
                const active = s.sessionId === activeSessionId
                const time = s.lastMessageAt
                  ? new Date(s.lastMessageAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''
                return (
                  <li key={s.sessionId}>
                    <button
                      onClick={() => setActiveSessionId(s.sessionId)}
                      className={`w-full text-left p-3 transition-colors ${
                        active
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white truncate">
                          {s.visitorInfo?.name ?? `访客 ${s.sessionId.slice(0, 6)}`}
                        </span>
                        <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">{time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 truncate flex-1">
                          {s.lastMessage ?? '（无消息）'}
                        </p>
                        {(s.unreadCount ?? 0) > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary text-dark-900 text-[10px] font-bold flex-shrink-0">
                            {s.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Chat panel */}
        <section className="flex-1 flex flex-col bg-dark-900">
          {!activeSessionId ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">从左侧选择会话开始聊天</p>
              </div>
            </div>
          ) : (
            <>
              {/* Active session header */}
              <div className="px-4 py-3 border-b border-white/5 bg-dark-800/50">
                <p className="text-sm font-medium text-white">
                  {activeSession?.visitorInfo?.name ?? `访客 ${activeSessionId.slice(0, 8)}`}
                </p>
                {activeSession?.visitorInfo?.email && (
                  <p className="text-xs text-gray-500">{activeSession.visitorInfo.email}</p>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => {
                  const isAdmin = msg.sender === 'admin'
                  const time = msg.createdAt
                    ? new Date(msg.createdAt as string).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''
                  return (
                    <div
                      key={(msg._id as string) ?? i}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[70%]">
                        <div
                          className={`px-3 py-2 text-sm break-words whitespace-pre-wrap ${
                            isAdmin
                              ? 'rounded-2xl rounded-br-sm bg-primary text-dark-900'
                              : 'rounded-2xl rounded-bl-sm bg-dark-700/50 border border-white/5 text-white'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <p
                          className={`text-[10px] text-gray-600 mt-1 px-1 ${
                            isAdmin ? 'text-right' : 'text-left'
                          }`}
                        >
                          {time}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-dark-800/30">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="回复访客... (Enter 发送)"
                    rows={1}
                    maxLength={2000}
                    className="flex-1 px-3 py-2 rounded-lg bg-dark-700/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors resize-none max-h-32"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="w-9 h-9 rounded-lg bg-primary text-dark-900 flex items-center justify-center disabled:opacity-30 transition-all hover:bg-primary-light"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
