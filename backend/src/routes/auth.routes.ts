import { Router, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { UserModel } from '../models/User.model'
import { verifyPassword } from '../services/auth.service'
import {
  signAccessToken,
  signMfaToken,
  signRefreshToken,
  verifyMfaToken,
  verifyRefreshToken,
} from '../services/token.service'
import { audit } from '../services/audit.service'
import { validateBody } from '../middleware/validate.middleware'
import { requireAdmin } from '../middleware/auth.middleware'
import { isProd, isTest } from '../config/env'
import {
  Disable2FARequestSchema,
  LoginRequestSchema,
  Setup2FAResponseSchema,
  Verify2FARequestSchema,
  VerifySetup2FARequestSchema,
  type Disable2FARequest,
  type LoginAuthenticated,
  type LoginMfaRequired,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
  type Setup2FAResponse,
  type Verify2FARequest,
  type VerifySetup2FAResponse,
  type VerifySetup2FARequest,
} from '@critical/shared'
import {
  buildOtpauthUri,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  hashRecoveryCodes,
  renderQrDataUrl,
  verifyTotp,
} from '../services/totp.service'

export const authRouter = Router()

const REFRESH_COOKIE = 'critical_rt'
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Per-mfaToken attempt counter. A given mfaToken (jti) may only attempt
 * verification 5 times before it's blacklisted, regardless of code freshness.
 * Stored in process memory — sufficient for single-instance backend; once
 * we shard to multiple replicas this should move to Redis.
 */
const MFA_MAX_ATTEMPTS = 5
const mfaAttempts = new Map<string, number>()
const mfaBlacklist = new Set<string>()

function bumpMfaAttempts(jti: string): number {
  const next = (mfaAttempts.get(jti) ?? 0) + 1
  mfaAttempts.set(jti, next)
  if (next >= MFA_MAX_ATTEMPTS) mfaBlacklist.add(jti)
  return next
}

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

interface FullLoginUser {
  _id: unknown
  username: string
  email: string
  role: 'admin' | 'agent'
  displayName?: string | null
  avatarUrl?: string | null
  disabled: boolean
  totpEnabled?: boolean
}

/** Issue access + refresh after both factors (or only password for non-2FA users) succeed. */
function completeLogin(
  res: Response,
  user: FullLoginUser,
  reqMeta: Parameters<typeof audit>[0]['req'],
): LoginAuthenticated {
  const userId = String(user._id)
  const accessToken = signAccessToken({
    sub: userId,
    username: user.username,
    role: user.role,
  })
  const { token: refreshToken } = signRefreshToken(userId)
  setRefreshCookie(res, refreshToken)

  audit({
    action: 'auth.login',
    actor: { type: 'admin', id: userId, username: user.username },
    req: reqMeta,
  })

  return {
    status: 'authenticated',
    accessToken,
    user: {
      _id: userId,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      disabled: user.disabled,
      totpEnabled: Boolean(user.totpEnabled),
    },
  }
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

/** Even stricter limiter on the verify-2fa step — 10 attempts per minute per IP. */
const verify2FaLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many 2FA attempts, try again later' },
  skip: () => isTest,
})

authRouter.post('/login', loginLimiter, validateBody(LoginRequestSchema), async (req, res) => {
  const { username, password } = req.body as LoginRequest
  // Defense-in-depth: although Zod has already coerced username to a non-empty
  // string, we cast explicitly so any NoSQL operator object (e.g. `{$ne: null}`)
  // that somehow slipped through Zod still gets stringified, neutralising
  // operator-injection regardless of input shape. CodeQL also stops flagging.
  const user = await UserModel.findOne({ username: String(username) }).select(
    '+passwordHash +totpSecret',
  )
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

  // 2FA enabled → step-1 done, hand back a bridge token.
  if (user.totpEnabled && user.totpSecret) {
    const userId = String(user._id)
    const { token: mfaToken } = signMfaToken(userId)
    audit({
      action: 'auth.mfa.required',
      actor: { type: 'admin', id: userId, username: user.username },
      req,
    })
    const response: LoginMfaRequired = { status: 'mfa_required', mfaToken }
    res.json(response)
    return
  }

  // No 2FA — full login immediately.
  user.lastLoginAt = new Date()
  await user.save()
  const response = completeLogin(res, user as unknown as FullLoginUser, req)
  res.json(response satisfies LoginResponse)
})

authRouter.post(
  '/verify-2fa',
  verify2FaLimiter,
  validateBody(Verify2FARequestSchema),
  async (req, res) => {
    const { mfaToken, code, recoveryCode } = req.body as Verify2FARequest

    let payload
    try {
      payload = verifyMfaToken(mfaToken)
    } catch {
      res.status(401).json({ error: 'Invalid or expired MFA token' })
      return
    }

    if (mfaBlacklist.has(payload.jti)) {
      res.status(401).json({ error: 'MFA token exhausted, restart login' })
      return
    }

    const user = await UserModel.findById(payload.sub).select('+totpSecret +totpRecoveryCodeHashes')
    if (!user || user.disabled || !user.totpEnabled || !user.totpSecret) {
      res.status(401).json({ error: 'Invalid MFA state' })
      return
    }

    let usedRecovery = false
    // The Zod schema guarantees exactly one of {code, recoveryCode} is set.
    // We capture the discriminator into a single variable up front, so the
    // branch below is a pure switch over a server-trusted value rather than
    // two independent user-controlled if-conditions (which CodeQL flags as
    // "user-controlled bypass of security check"). Functionally identical.
    const factor: 'totp' | 'recovery' = code ? 'totp' : 'recovery'

    if (factor === 'totp') {
      if (!code || !verifyTotp(user.totpSecret, code)) {
        const attempts = bumpMfaAttempts(payload.jti)
        audit({
          action: 'auth.mfa.verify',
          actor: { type: 'admin', id: String(user._id), username: user.username },
          success: false,
          req,
          meta: { reason: 'bad_code', attempts },
        })
        res.status(401).json({
          error: 'Invalid 2FA code',
          attemptsRemaining: Math.max(0, MFA_MAX_ATTEMPTS - attempts),
        })
        return
      }
    } else {
      if (!recoveryCode) {
        res.status(400).json({ error: 'code or recoveryCode is required' })
        return
      }
      const candidateHash = hashRecoveryCode(recoveryCode)
      const idx = user.totpRecoveryCodeHashes.indexOf(candidateHash)
      if (idx === -1) {
        const attempts = bumpMfaAttempts(payload.jti)
        audit({
          action: 'auth.mfa.verify',
          actor: { type: 'admin', id: String(user._id), username: user.username },
          success: false,
          req,
          meta: { reason: 'bad_recovery', attempts },
        })
        res.status(401).json({
          error: 'Invalid recovery code',
          attemptsRemaining: Math.max(0, MFA_MAX_ATTEMPTS - attempts),
        })
        return
      }
      // Consume the recovery code (one-time use).
      user.totpRecoveryCodeHashes.splice(idx, 1)
      usedRecovery = true
    }

    // Success — invalidate the bridge token immediately.
    mfaBlacklist.add(payload.jti)
    mfaAttempts.delete(payload.jti)

    user.lastLoginAt = new Date()
    await user.save()

    if (usedRecovery) {
      audit({
        action: 'auth.mfa.recovery_used',
        actor: { type: 'admin', id: String(user._id), username: user.username },
        req,
        meta: { remaining: user.totpRecoveryCodeHashes.length },
      })
    }

    const response = completeLogin(res, user as unknown as FullLoginUser, req)
    res.json(response satisfies LoginResponse)
  },
)

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
      totpEnabled: Boolean(user.totpEnabled),
    },
  }
  res.json(response)
})

// ─────────────────────────────────────────────────────────────────────────
// 2FA setup / disable — must be authenticated with the user's own session.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Stash for not-yet-activated TOTP secrets.
 * The secret is generated server-side at /setup time, but only persisted
 * to MongoDB once the user proves they scanned the QR by entering a code at
 * /verify-setup. Until then it lives in memory keyed by user id.
 *
 * Why not put it in the User doc directly? An attacker who steals a session
 * could call /setup repeatedly and overwrite the legitimate secret of a user
 * who has 2FA enabled. By keeping the pending secret separate from the
 * activated one, an unconfirmed setup never affects existing 2FA state.
 */
const pendingTotpSecrets = new Map<string, { secret: string; expiresAt: number }>()
const PENDING_SECRET_TTL_MS = 10 * 60 * 1000

function gcPendingSecrets(): void {
  const now = Date.now()
  for (const [k, v] of pendingTotpSecrets) {
    if (v.expiresAt < now) pendingTotpSecrets.delete(k)
  }
}

authRouter.post('/2fa/setup', requireAdmin, async (req, res) => {
  gcPendingSecrets()
  const userId = req.admin!.sub
  const user = await UserModel.findById(userId).lean()
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (user.totpEnabled) {
    res.status(409).json({ error: '2FA is already enabled; disable it first' })
    return
  }

  const secret = generateTotpSecret()
  const uri = buildOtpauthUri(secret, user.username)
  const qr = await renderQrDataUrl(uri)

  pendingTotpSecrets.set(userId, { secret, expiresAt: Date.now() + PENDING_SECRET_TTL_MS })

  audit({
    action: 'auth.mfa.setup_started',
    actor: { type: 'admin', id: userId, username: user.username },
    req,
  })

  const response: Setup2FAResponse = Setup2FAResponseSchema.parse({ secret, uri, qr })
  res.json(response)
})

authRouter.post(
  '/2fa/verify-setup',
  requireAdmin,
  validateBody(VerifySetup2FARequestSchema),
  async (req, res) => {
    gcPendingSecrets()
    const userId = req.admin!.sub
    const { code } = req.body as VerifySetup2FARequest
    const pending = pendingTotpSecrets.get(userId)
    if (!pending) {
      res.status(400).json({ error: 'No pending 2FA setup; call /setup first' })
      return
    }
    if (!verifyTotp(pending.secret, code)) {
      res.status(401).json({ error: 'Invalid 2FA code' })
      return
    }

    // Code OK — activate 2FA and issue recovery codes.
    const recoveryCodes = generateRecoveryCodes()
    const user = await UserModel.findById(userId).select('+totpSecret +totpRecoveryCodeHashes')
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    user.totpSecret = pending.secret
    user.totpEnabled = true
    user.totpActivatedAt = new Date()
    user.totpRecoveryCodeHashes = hashRecoveryCodes(recoveryCodes)
    await user.save()
    pendingTotpSecrets.delete(userId)

    audit({
      action: 'auth.mfa.enabled',
      actor: { type: 'admin', id: userId, username: user.username },
      req,
    })

    const response: VerifySetup2FAResponse = { recoveryCodes }
    res.json(response)
  },
)

authRouter.post(
  '/2fa/disable',
  requireAdmin,
  validateBody(Disable2FARequestSchema),
  async (req, res) => {
    const userId = req.admin!.sub
    const { password, code, recoveryCode } = req.body as Disable2FARequest
    const user = await UserModel.findById(userId).select(
      '+passwordHash +totpSecret +totpRecoveryCodeHashes',
    )
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    if (!user.totpEnabled || !user.totpSecret) {
      res.status(409).json({ error: '2FA is not enabled' })
      return
    }

    const pwOk = await verifyPassword(password, user.passwordHash)
    if (!pwOk) {
      audit({
        action: 'auth.mfa.disable',
        actor: { type: 'admin', id: userId, username: user.username },
        success: false,
        req,
        meta: { reason: 'bad_password' },
      })
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    // Same factor-discriminator pattern as /verify-2fa: schema enforces
    // exactly one of {code, recoveryCode}; we capture the choice into a
    // server-trusted enum, then each branch self-validates and early-returns
    // on failure. This avoids the "user-controlled bypass of security check"
    // pattern (a sensitive action guarded by a boolean derived from user input).
    const factor: 'totp' | 'recovery' = code ? 'totp' : 'recovery'

    if (factor === 'totp') {
      if (!code || !verifyTotp(user.totpSecret, code)) {
        audit({
          action: 'auth.mfa.disable',
          actor: { type: 'admin', id: userId, username: user.username },
          success: false,
          req,
          meta: { reason: 'bad_second_factor' },
        })
        res.status(401).json({ error: 'Invalid 2FA code' })
        return
      }
    } else {
      if (!recoveryCode || !user.totpRecoveryCodeHashes.includes(hashRecoveryCode(recoveryCode))) {
        audit({
          action: 'auth.mfa.disable',
          actor: { type: 'admin', id: userId, username: user.username },
          success: false,
          req,
          meta: { reason: 'bad_second_factor' },
        })
        res.status(401).json({ error: 'Invalid 2FA code' })
        return
      }
    }
    // Both branches above either return on failure or fall through here on success.

    user.totpSecret = null
    user.totpEnabled = false
    user.totpActivatedAt = null
    user.totpRecoveryCodeHashes = []
    await user.save()

    audit({
      action: 'auth.mfa.disabled',
      actor: { type: 'admin', id: userId, username: user.username },
      req,
    })

    res.json({ ok: true })
  },
)
