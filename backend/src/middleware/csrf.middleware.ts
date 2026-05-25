import { randomBytes } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { env, isProd } from '../config/env'

/**
 * Double-submit cookie CSRF protection (OWASP recommended).
 *
 * Strategy: every response sets a `critical_csrf` cookie (readable by JS,
 * NOT httpOnly). State-changing requests (POST/PUT/PATCH/DELETE) must echo
 * the cookie value back in the `X-CSRF-Token` header. Cross-origin attackers
 * cannot read the cookie (SameSite + CORS), so they cannot forge the header.
 */

const CSRF_COOKIE = 'critical_csrf'
const CSRF_HEADER = 'x-csrf-token'
const TOKEN_BYTES = 32
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Public POST endpoints that don't use cookie auth — exempt from CSRF. */
const CSRF_EXEMPT_PATHS = new Set<string>(['/api/leads', '/api/auth/login', '/api/chat/session'])

/** Set (or refresh) the CSRF cookie on every response. */
export function csrfCookieSetter(req: Request, res: Response, next: NextFunction): void {
  const cookies: Record<string, string | undefined> = req.cookies ?? {}
  const existing = cookies[CSRF_COOKIE]
  if (!existing) {
    const token = randomBytes(TOKEN_BYTES).toString('hex')
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // JS must be able to read it
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24h
    })
  }
  next()
}

/**
 * Validate CSRF token on state-changing requests.
 * - Skips safe methods (GET, HEAD, OPTIONS)
 * - Skips Bearer-authenticated requests (token not auto-attached by browser)
 * - Skips public endpoints listed in CSRF_EXEMPT_PATHS
 * - Disabled in test environment
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === 'test') return next()
  if (SAFE_METHODS.has(req.method)) return next()

  if (CSRF_EXEMPT_PATHS.has(req.path)) return next()

  // Bearer-authenticated requests are immune to CSRF (token not in cookies).
  // EXCEPTION: refresh endpoint uses cookies, so it MUST be protected.
  const hasBearer = req.headers.authorization?.startsWith('Bearer ')
  const isRefreshEndpoint = req.path === '/api/auth/refresh'
  if (hasBearer && !isRefreshEndpoint) return next()

  const cookies: Record<string, string | undefined> = req.cookies ?? {}
  const cookieToken = cookies[CSRF_COOKIE]
  const headerToken = req.headers[CSRF_HEADER]

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: 'CSRF token mismatch' })
    return
  }
  next()
}
