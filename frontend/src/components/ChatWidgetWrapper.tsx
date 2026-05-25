'use client'

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

// Lazy load — chat widget bundle (socket.io-client) loaded only when needed
const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false })

/**
 * Mounts the ChatWidget on public pages only.
 * Hidden on /admin/* (admins use the dedicated chat panel) and legal pages.
 */
export default function ChatWidgetWrapper() {
  const pathname = usePathname()

  // Don't show widget on admin pages or while loading
  if (!pathname || pathname.startsWith('/admin')) return null

  return <ChatWidget />
}
