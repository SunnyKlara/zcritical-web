import { Router, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { UserModel } from '../models/User.model'
import { verifyPassword } from '../services/auth.service'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/token.service'
import { audit } from '../services/audit.service'
import { validateBody } from '../middleware/validate.middleware'
import { requireAdmin } from '../middleware/auth.middleware'
import { isProd, isTest } from '../config/env'
import {
  LoginRequestSchema,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
} from '@critical/shared'

export const authRouter = Router()

const REFRESH_COOKIE = 'critical_rt'
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    // Must be 'none' for cross-origin (Vercel frontend → Render backend).
    // CSRF protection via double-submit cookie guards against cross-site abuse.
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  })
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
}

/** Stricter rate limit for login to slow down brute-force. */
const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' },
  skip: () => isTest,
})

authRouter.post('/login', loginLimiter, validateBody(LoginRequestSchema), async (req, res) => {
  const { username, password } = req.body as LoginRequest
  const user = await UserModel.findOne({ username }).select('+passwordHash')
  if (!user || user.disabled) {
    audit({ action: 'auth.login', actor: { type: 'admin', username }, success: false, req })
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    audit({ action: 'auth.login', actor: { type: 'admin', username }, success: false, req })
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const userId = String(user._id)
  const accessToken = signAccessToken({
    sub: userId,
    username: user.username,
    role: user.role,
  })
  const { token: refreshToken } = signRefreshToken(userId)
  setRefreshCookie(res, refreshToken)

  user.lastLoginAt = new Date()
  await user.save()

  audit({ action: 'auth.login', actor: { type: 'admin', id: userId, username }, req })

  const response: LoginResponse = {
    accessToken,
    user: {
      _id: userId,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      disabled: user.disabled,
    },
  }
  res.json(response)
})

authRouter.post('/refresh', async (req, res) => {
  const cookies = req.cookies as Record<string, string | undefined> | undefined
  const token = cookies?.[REFRESH_COOKIE]
  if (!token) {
    res.status(401).json({ error: 'No refresh token' })
    return
  }
  try {
    const payload = verifyRefreshToken(token)
    const user = await UserModel.findById(payload.sub).lean()
    if (!user || user.disabled) {
      clearRefreshCookie(res)
      res.status(401).json({ error: 'User not found or disabled' })
      return
    }
    const accessToken = signAccessToken({
      sub: String(user._id),
      username: user.username,
      role: user.role,
    })
    // Rotate refresh token (best practice: each refresh issues a fresh one).
    const { token: newRefresh } = signRefreshToken(String(user._id))
    setRefreshCookie(res, newRefresh)
    res.json({ accessToken })
  } catch {
    clearRefreshCookie(res)
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

authRouter.post('/logout', (req, res) => {
  clearRefreshCookie(res)
  audit({ action: 'auth.logout', actor: { type: 'admin' }, req })
  res.json({ ok: true })
})

authRouter.get('/me', requireAdmin, async (req, res) => {
  const user = await UserModel.findById(req.admin!.sub).lean()
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  const response: MeResponse = {
    user: {
      _id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      disabled: user.disabled,
    },
  }
  res.json(response)
})
