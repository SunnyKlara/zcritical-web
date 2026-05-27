import { Router, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { UserModel } from '../models/User.model'
import {
  isLockedOut,
  recordFailedLogin,
  recordSuccessfulLogin,
  hashPassword,
  verifyPassword,
} from '../services/auth.service'
import { checkPasswordStrength } from '../services/password.service'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/token.service'
import {
  BACKUP_CODE_COUNT,
  TOTP_ISSUER,
  TWO_FACTOR_TOKEN_TTL_SECONDS,
  buildOtpauthUrl,
  consumeBackupCode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  sign2faChallengeToken,
  verify2faChallengeToken,
  verifyTotpCode,
} from '../services/two-factor.service'
import { audit } from '../services/audit.service'
import { recordLoginAndNotify } from '../services/login-device.service'
import { validateBody } from '../middleware/validate.middleware'
import { requireAdmin } from '../middleware/auth.middleware'
import { isProd, isTest } from '../config/env'
import {
  LoginRequestSchema,
  ChangePasswordRequestSchema,
  TwoFactorDisableRequestSchema,
  TwoFactorEnableRequestSchema,
  TwoFactorVerifyRequestSchema,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
  type TwoFactorEnableResponse,
  type TwoFactorSetupResponse,
  type TwoFactorStatusResponse,
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

/** IP-based login limiter (5/min). Existing protection — unchanged contract. */
const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' },
  skip: () => isTest,
})

/**
 * Username-based login limiter — defends against credential-stuffing where
 * each request comes from a different IP but targets the same account.
 *
 * Window: 5 attempts / 5 minutes / username (case-insensitive).
 */
const usernameLoginLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const body = req.body as { username?: unknown }
    const u = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
    // Empty username falls through to the IP limiter / Zod validation.
    return u || `_anon:${req.ip ?? ''}`
  },
  message: { error: 'Too many login attempts for this account, try again later' },
  skip: () => isTest,
})

/** Limit 2FA verify attempts to prevent brute-forcing the 6-digit code. */
const twoFactorLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many 2FA attempts, try again later' },
  skip: () => isTest,
})

interface PublicUserPayload {
  _id: string
  username: string
  email: string
  role: 'admin' | 'agent'
  displayName?: string
  avatarUrl?: string
  disabled: boolean
}

function projectUser(user: {
  _id: unknown
  username: string
  email: string
  role: 'admin' | 'agent'
  displayName?: string | null
  avatarUrl?: string | null
  disabled?: boolean
}): PublicUserPayload {
  return {
    _id: String(user._id),
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    disabled: user.disabled ?? false,
  }
}

async function issueLoginSuccess(
  res: Response,
  user: { _id: unknown; username: string; role: 'admin' | 'agent' },
): Promise<{ accessToken: string }> {
  const userId = String(user._id)
  const accessToken = signAccessToken({
    sub: userId,
    username: user.username,
    role: user.role,
  })
  const { token: refreshToken } = signRefreshToken(userId)
  setRefreshCookie(res, refreshToken)
  return { accessToken }
}

// ─── POST /api/auth/login ───────────────────────────────────────────────────

authRouter.post(
  '/login',
  loginLimiter,
  usernameLoginLimiter,
  validateBody(LoginRequestSchema),
  async (req, res, next) => {
    try {
      const { username, password } = req.body as LoginRequest
      const user = await UserModel.findOne({ username }).select(
        '+passwordHash +twoFactorSecret +failedLoginAttempts +lockedUntil',
      )

      if (!user || user.disabled) {
        audit({ action: 'auth.login', actor: { type: 'admin', username }, success: false, req })
        // Generic error — don't disclose whether the username exists.
        res.status(401).json({ error: 'Invalid credentials' })
        return
      }

      if (await isLockedOut(user)) {
        audit({
          action: 'auth.login.locked',
          actor: { type: 'admin', username },
          success: false,
          req,
        })
        res.status(423).json({
          error: 'Account temporarily locked due to repeated failed attempts',
          lockedUntil: user.lockedUntil,
        })
        return
      }

      const ok = await verifyPassword(password, user.passwordHash)
      if (!ok) {
        const { locked, lockedUntil } = await recordFailedLogin(user)
        audit({
          action: locked ? 'auth.login.lock' : 'auth.login',
          actor: { type: 'admin', username },
          success: false,
          meta: { attempts: user.failedLoginAttempts },
          req,
        })
        if (locked) {
          res.status(423).json({
            error: 'Account temporarily locked due to repeated failed attempts',
            lockedUntil,
          })
          return
        }
        res.status(401).json({ error: 'Invalid credentials' })
        return
      }

      // Password OK — branch on 2FA enrollment.
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        const twoFactorToken = sign2faChallengeToken(String(user._id))
        audit({
          action: 'auth.login.2fa_required',
          actor: { type: 'admin', id: String(user._id), username },
          req,
        })
        const response: LoginResponse = {
          requiresTwoFactor: true,
          twoFactorToken,
          expiresIn: TWO_FACTOR_TOKEN_TTL_SECONDS,
        }
        res.json(response)
        return
      }

      await recordSuccessfulLogin(user)
      const { accessToken } = await issueLoginSuccess(res, user)
      audit({
        action: 'auth.login',
        actor: { type: 'admin', id: String(user._id), username },
        req,
      })
      void recordLoginAndNotify({
        userId: String(user._id),
        username: user.username,
        email: user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })
      const response: LoginResponse = {
        accessToken,
        user: projectUser(user),
      }
      res.json(response)
    } catch (err) {
      next(err)
    }
  },
)

// ─── POST /api/auth/2fa/verify ─────────────────────────────────────────────

authRouter.post(
  '/2fa/verify',
  twoFactorLimiter,
  validateBody(TwoFactorVerifyRequestSchema),
  async (req, res, next) => {
    try {
      const { twoFactorToken, code, backupCode } = req.body as {
        twoFactorToken: string
        code?: string
        backupCode?: string
      }

      let userId: string
      try {
        userId = verify2faChallengeToken(twoFactorToken).sub
      } catch {
        res.status(401).json({ error: 'Invalid or expired 2FA token' })
        return
      }

      const user = await UserModel.findById(userId).select(
        '+twoFactorSecret +twoFactorBackupCodes +twoFactorLastStep +failedLoginAttempts +lockedUntil',
      )
      if (!user || user.disabled || !user.twoFactorEnabled || !user.twoFactorSecret) {
        res.status(401).json({ error: 'Invalid 2FA state' })
        return
      }

      if (await isLockedOut(user)) {
        res.status(423).json({ error: 'Account temporarily locked' })
        return
      }

      let success = false
      if (code) {
        try {
          const secret = decryptTotpSecret(user.twoFactorSecret)
          const acceptedStep = verifyTotpCode(code, secret, user.twoFactorLastStep ?? 0)
          if (acceptedStep !== null) {
            user.twoFactorLastStep = acceptedStep
            success = true
          }
        } catch {
          success = false
        }
      } else if (backupCode) {
        success = await consumeBackupCode(String(user._id), backupCode)
      }

      if (!success) {
        const { locked, lockedUntil } = await recordFailedLogin(user)
        audit({
          action: 'auth.2fa.fail',
          actor: { type: 'admin', id: String(user._id), username: user.username },
          success: false,
          req,
        })
        if (locked) {
          res.status(423).json({ error: 'Account locked', lockedUntil })
          return
        }
        res.status(401).json({ error: 'Invalid 2FA code' })
        return
      }

      await recordSuccessfulLogin(user)
      const { accessToken } = await issueLoginSuccess(res, user)
      audit({
        action: 'auth.2fa.success',
        actor: { type: 'admin', id: String(user._id), username: user.username },
        req,
      })
      void recordLoginAndNotify({
        userId: String(user._id),
        username: user.username,
        email: user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })
      res.json({
        accessToken,
        user: projectUser(user),
      })
    } catch (err) {
      next(err)
    }
  },
)

// ─── POST /api/auth/refresh ─────────────────────────────────────────────────

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
    user: projectUser(user),
  }
  res.json(response)
})

// ─── 2FA enrollment / management (authenticated) ───────────────────────────

authRouter.get('/2fa/status', requireAdmin, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.admin!.sub)
      .select('+twoFactorBackupCodes +twoFactorEnabled')
      .lean()
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    const remaining = (user.twoFactorBackupCodes ?? []).filter((c) => !c.usedAt).length
    const response: TwoFactorStatusResponse = {
      enabled: !!user.twoFactorEnabled,
      backupCodesRemaining: user.twoFactorEnabled ? remaining : 0,
    }
    res.json(response)
  } catch (err) {
    next(err)
  }
})

/**
 * Step 1 of enrollment: generate a fresh secret and persist it (still
 * `twoFactorEnabled = false`). Returns the otpauth URL for QR rendering.
 */
authRouter.post('/2fa/setup', requireAdmin, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.admin!.sub).select(
      '+twoFactorSecret +twoFactorBackupCodes +twoFactorLastStep +twoFactorEnabled',
    )
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    if (user.twoFactorEnabled) {
      res.status(409).json({ error: '2FA already enabled — disable first to re-enroll' })
      return
    }
    const secret = generateTotpSecret()
    user.twoFactorSecret = encryptTotpSecret(secret)
    user.twoFactorBackupCodes.splice(0, user.twoFactorBackupCodes.length)
    user.twoFactorLastStep = 0
    await user.save()

    const account = `${user.username}@${TOTP_ISSUER.toLowerCase()}`
    const otpauthUrl = buildOtpauthUrl(account, secret)
    audit({
      action: 'auth.2fa.setup',
      actor: { type: 'admin', id: String(user._id), username: user.username },
      req,
    })
    const response: TwoFactorSetupResponse = {
      secret,
      otpauthUrl,
      issuer: TOTP_ISSUER,
      account,
    }
    res.json(response)
  } catch (err) {
    next(err)
  }
})

/**
 * Step 2 of enrollment: user submits the first generated code to prove they
 * scanned the QR. Backup codes are surfaced exactly once.
 */
authRouter.post(
  '/2fa/enable',
  requireAdmin,
  validateBody(TwoFactorEnableRequestSchema),
  async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.admin!.sub).select(
        '+twoFactorSecret +twoFactorBackupCodes +twoFactorLastStep +twoFactorEnabled',
      )
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }
      if (user.twoFactorEnabled) {
        res.status(409).json({ error: '2FA already enabled' })
        return
      }
      if (!user.twoFactorSecret) {
        res.status(400).json({ error: 'Run /auth/2fa/setup first' })
        return
      }

      const secret = decryptTotpSecret(user.twoFactorSecret)
      const accepted = verifyTotpCode(req.body.code, secret, user.twoFactorLastStep ?? 0)
      if (accepted === null) {
        audit({
          action: 'auth.2fa.enable.fail',
          actor: { type: 'admin', id: String(user._id), username: user.username },
          success: false,
          req,
        })
        res.status(401).json({ error: 'Invalid code' })
        return
      }

      const backupCodes = generateBackupCodes(BACKUP_CODE_COUNT)
      user.twoFactorEnabled = true
      user.twoFactorLastStep = accepted
      user.twoFactorBackupCodes.splice(
        0,
        user.twoFactorBackupCodes.length,
        ...backupCodes.map((c) => ({ hash: hashBackupCode(c), usedAt: null })),
      )
      await user.save()

      audit({
        action: 'auth.2fa.enable',
        actor: { type: 'admin', id: String(user._id), username: user.username },
        req,
      })
      const response: TwoFactorEnableResponse = {
        enabled: true,
        backupCodes,
      }
      res.json(response)
    } catch (err) {
      next(err)
    }
  },
)

/** Disable 2FA — requires the current password as a confirmation step. */
authRouter.post(
  '/2fa/disable',
  requireAdmin,
  validateBody(TwoFactorDisableRequestSchema),
  async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.admin!.sub).select(
        '+passwordHash +twoFactorSecret +twoFactorBackupCodes +twoFactorEnabled',
      )
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }
      const ok = await verifyPassword(req.body.password, user.passwordHash)
      if (!ok) {
        audit({
          action: 'auth.2fa.disable.fail',
          actor: { type: 'admin', id: String(user._id), username: user.username },
          success: false,
          req,
        })
        res.status(401).json({ error: 'Password incorrect' })
        return
      }
      user.twoFactorEnabled = false
      user.twoFactorSecret = null
      user.twoFactorBackupCodes.splice(0, user.twoFactorBackupCodes.length)
      user.twoFactorLastStep = 0
      await user.save()
      audit({
        action: 'auth.2fa.disable',
        actor: { type: 'admin', id: String(user._id), username: user.username },
        req,
      })
      res.json({ enabled: false })
    } catch (err) {
      next(err)
    }
  },
)

/**
 * Regenerate backup codes (invalidates all previous ones). Used when the
 * admin runs out of codes or thinks they've been compromised.
 */
authRouter.post('/2fa/backup-codes', requireAdmin, async (req: Request, res, next) => {
  try {
    const user = await UserModel.findById(req.admin!.sub).select(
      '+twoFactorEnabled +twoFactorBackupCodes',
    )
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    if (!user.twoFactorEnabled) {
      res.status(400).json({ error: '2FA is not enabled' })
      return
    }
    const backupCodes = generateBackupCodes(BACKUP_CODE_COUNT)
    user.twoFactorBackupCodes.splice(
      0,
      user.twoFactorBackupCodes.length,
      ...backupCodes.map((c) => ({ hash: hashBackupCode(c), usedAt: null })),
    )
    await user.save()
    audit({
      action: 'auth.2fa.backup-codes.regenerate',
      actor: { type: 'admin', id: String(user._id), username: user.username },
      req,
    })
    const response: TwoFactorEnableResponse = { enabled: true, backupCodes }
    res.json(response)
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/auth/change-password ─────────────────────────────────────────

/**
 * Change the authenticated admin's password. Requires the current password as
 * a confirmation step (mitigates session theft) and enforces zxcvbn-ts
 * strength rules.
 */
authRouter.post(
  '/change-password',
  requireAdmin,
  validateBody(ChangePasswordRequestSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string
        newPassword: string
      }

      const user = await UserModel.findById(req.admin!.sub).select('+passwordHash')
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const ok = await verifyPassword(currentPassword, user.passwordHash)
      if (!ok) {
        audit({
          action: 'auth.password.change.fail',
          actor: { type: 'admin', id: String(user._id), username: user.username },
          success: false,
          req,
        })
        res.status(401).json({ error: 'Current password is incorrect' })
        return
      }

      if (currentPassword === newPassword) {
        res.status(400).json({ error: 'New password must differ from the current one' })
        return
      }

      const strength = checkPasswordStrength(newPassword, [
        user.username,
        user.email,
        user.displayName ?? '',
      ])
      if (!strength.ok) {
        res.status(400).json({
          error: 'Password is too weak',
          score: strength.score,
          warning: strength.feedback?.warning,
          suggestions: strength.feedback?.suggestions ?? [],
        })
        return
      }

      user.passwordHash = await hashPassword(newPassword)
      // Bump tokenVersion so any outstanding refresh tokens become invalid;
      // the user will need to log in again everywhere else.
      user.tokenVersion = (user.tokenVersion ?? 0) + 1
      await user.save()

      audit({
        action: 'auth.password.change',
        actor: { type: 'admin', id: String(user._id), username: user.username },
        req,
      })
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)
