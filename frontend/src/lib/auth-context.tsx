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
  /** True iff TOTP 2FA is currently active. */
  totpEnabled?: boolean
}

interface AuthenticatedLoginResponse {
  status: 'authenticated'
  accessToken: string
  user: AdminUser
}

interface MfaRequiredLoginResponse {
  status: 'mfa_required'
  mfaToken: string
}

type LoginResponse = AuthenticatedLoginResponse | MfaRequiredLoginResponse

/**
 * The result the login form sees:
 *   - 'authenticated' → normal flow, AuthContext already populated.
 *   - 'mfa_required'  → caller must show the 6-digit code step and then
 *                       call verify2FA() with the returned mfaToken.
 */
export type LoginOutcome =
  | { status: 'authenticated' }
  | { status: 'mfa_required'; mfaToken: string }

export interface Setup2FAData {
  secret: string
  uri: string
  qr: string
}

export interface VerifySetup2FAResult {
  recoveryCodes: string[]
}

interface AuthContextValue {
  user: AdminUser | null
  accessToken: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<LoginOutcome>
  verify2FA: (
    mfaToken: string,
    args: { code?: string; recoveryCode?: string },
  ) => Promise<{ attemptsRemaining?: number }>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
  // 2FA management (must be called while authenticated).
  setupTotp: () => Promise<Setup2FAData>
  verifySetupTotp: (code: string) => Promise<VerifySetup2FAResult>
  disableTotp: (args: { password: string; code?: string; recoveryCode?: string }) => Promise<void>
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

  /**
   * Step 1 of login. Returns 'authenticated' if 2FA disabled / not set up,
   * or 'mfa_required' along with an opaque token to be exchanged at
   * /verify-2fa. The form is responsible for routing to the second step.
   */
  const login = useCallback(async (username: string, password: string): Promise<LoginOutcome> => {
    const response = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    if (response.status === 'authenticated') {
      setAccessToken(response.accessToken)
      setUser(response.user)
      sessionStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
      return { status: 'authenticated' }
    }
    return { status: 'mfa_required', mfaToken: response.mfaToken }
  }, [])

  /**
   * Step 2 of login — exchanges mfaToken + (TOTP code | recovery code)
   * for full session. On successful response, AuthContext is populated as
   * with a normal login.
   *
   * Returns { attemptsRemaining } only on the 401 path (so the form can
   * show "X tries left" without parsing ApiError twice).
   */
  const verify2FA = useCallback(
    async (
      mfaToken: string,
      args: { code?: string; recoveryCode?: string },
    ): Promise<{ attemptsRemaining?: number }> => {
      try {
        const response = await apiFetch<AuthenticatedLoginResponse>('/api/auth/verify-2fa', {
          method: 'POST',
          body: JSON.stringify({ mfaToken, ...args }),
        })
        setAccessToken(response.accessToken)
        setUser(response.user)
        sessionStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
        return {}
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const details = err.details as { attemptsRemaining?: number } | undefined
          if (typeof details?.attemptsRemaining === 'number') {
            // Re-throw with metadata so the caller can branch on remaining attempts
            throw Object.assign(err, { attemptsRemaining: details.attemptsRemaining })
          }
        }
        throw err
      }
    },
    [],
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

  // ─── 2FA management ──────────────────────────────────────────────────────

  const requireToken = useCallback((): string => {
    if (!accessToken) {
      throw new ApiError(401, 'Not authenticated')
    }
    return accessToken
  }, [accessToken])

  const setupTotp = useCallback(async (): Promise<Setup2FAData> => {
    const token = requireToken()
    return apiFetch<Setup2FAData>('/api/auth/2fa/setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  }, [requireToken])

  const verifySetupTotp = useCallback(
    async (code: string): Promise<VerifySetup2FAResult> => {
      const token = requireToken()
      const result = await apiFetch<VerifySetup2FAResult>('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      })
      // Activation succeeded — refresh user so totpEnabled flag is current.
      await refresh()
      return result
    },
    [requireToken, refresh],
  )

  const disableTotp = useCallback(
    async (args: { password: string; code?: string; recoveryCode?: string }): Promise<void> => {
      const token = requireToken()
      await apiFetch<{ ok: true }>('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(args),
      })
      await refresh()
    },
    [requireToken, refresh],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        verify2FA,
        logout,
        refresh,
        setupTotp,
        verifySetupTotp,
        disableTotp,
      }}
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
