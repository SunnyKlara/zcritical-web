'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiFetch, ApiError } from './api'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  _id: string
  username: string
  email: string
  role: 'admin' | 'agent'
  displayName?: string
  avatarUrl?: string
  disabled: boolean
}

interface LoginSuccessResponse {
  accessToken: string
  user: AdminUser
  requiresTwoFactor?: false
}

interface LoginTwoFactorChallengeResponse {
  requiresTwoFactor: true
  twoFactorToken: string
  expiresIn: number
}

type LoginResponse = LoginSuccessResponse | LoginTwoFactorChallengeResponse

/** Result of `login` — either fully signed in, or a challenge to complete. */
export type LoginResult =
  | { kind: 'authenticated' }
  | { kind: 'twoFactor'; twoFactorToken: string; expiresIn: number }

interface AuthContextValue {
  user: AdminUser | null
  accessToken: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<LoginResult>
  /** Complete a 2FA challenge with a TOTP code or one-time backup code. */
  verifyTwoFactor: (input: {
    twoFactorToken: string
    code?: string
    backupCode?: string
  }) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ACCESS_TOKEN_KEY = 'critical:admin_token'

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Try to refresh on mount (uses httpOnly refresh cookie)
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiFetch<{ accessToken: string }>('/api/auth/refresh', {
        method: 'POST',
      })
      setAccessToken(response.accessToken)
      sessionStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)

      // Fetch current user
      const meResponse = await apiFetch<{ user: AdminUser }>('/api/auth/me', {
        headers: { Authorization: `Bearer ${response.accessToken}` },
      })
      setUser(meResponse.user)
      return true
    } catch {
      setAccessToken(null)
      setUser(null)
      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      return false
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const finalizeAuthenticated = useCallback((response: LoginSuccessResponse) => {
    setAccessToken(response.accessToken)
    setUser(response.user)
    sessionStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
  }, [])

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      const response = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      if (response.requiresTwoFactor === true) {
        return {
          kind: 'twoFactor',
          twoFactorToken: response.twoFactorToken,
          expiresIn: response.expiresIn,
        }
      }
      finalizeAuthenticated(response)
      return { kind: 'authenticated' }
    },
    [finalizeAuthenticated],
  )

  const verifyTwoFactor = useCallback(
    async (input: { twoFactorToken: string; code?: string; backupCode?: string }) => {
      const response = await apiFetch<LoginSuccessResponse>('/api/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      finalizeAuthenticated(response)
    },
    [finalizeAuthenticated],
  )

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore — clear local state anyway
    }
    setAccessToken(null)
    setUser(null)
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, login, verifyTwoFactor, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

// ─── Authenticated fetch helper ─────────────────────────────────────────────

/**
 * Fetch helper for admin endpoints. Auto-attaches Bearer token.
 * On 401, attempts a refresh once before giving up.
 */
export async function authFetch<T>(
  path: string,
  init: RequestInit = {},
  context: { accessToken: string | null; refresh: () => Promise<boolean> },
): Promise<T> {
  const headers = new Headers(init.headers)
  if (context.accessToken) {
    headers.set('Authorization', `Bearer ${context.accessToken}`)
  }

  try {
    return await apiFetch<T>(path, { ...init, headers })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const refreshed = await context.refresh()
      if (refreshed) {
        // Retry once with new token (read from sessionStorage since context closure is stale)
        const newToken = sessionStorage.getItem(ACCESS_TOKEN_KEY)
        const retryHeaders = new Headers(init.headers)
        if (newToken) retryHeaders.set('Authorization', `Bearer ${newToken}`)
        return apiFetch<T>(path, { ...init, headers: retryHeaders })
      }
    }
    throw err
  }
}
