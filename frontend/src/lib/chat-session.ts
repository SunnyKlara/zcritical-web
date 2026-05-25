'use client'

import { apiFetch } from './api'
import type { IssueSessionResponse } from '@critical/shared'

const SESSION_KEY = 'critical:chat_session'

export interface StoredSession {
  sessionId: string
  sessionToken: string
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

export function setStoredSession(session: StoredSession): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_KEY)
}

/**
 * Get an existing session (from localStorage) or issue a new one from the backend.
 * Returns the session credentials needed for Socket.io auth.
 */
export async function ensureChatSession(): Promise<StoredSession> {
  const existing = getStoredSession()
  if (existing) return existing

  const response = await apiFetch<IssueSessionResponse>('/api/chat/session', {
    method: 'POST',
    body: JSON.stringify({}),
  })

  const session: StoredSession = {
    sessionId: response.sessionId,
    sessionToken: response.sessionToken,
  }
  setStoredSession(session)
  return session
}
