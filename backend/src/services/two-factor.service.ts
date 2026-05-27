/**
 * Time-based One-Time Password (TOTP) helpers for admin 2FA.
 *
 * Library: `otplib` (RFC 6238 compliant, pure TS, no native deps).
 * Storage: TOTP secret is encrypted with AES-256-GCM at rest, and the last
 * accepted step counter is persisted to prevent code replay within its
 * 30-second window.
 *
 * Backup codes are 5+5 lower-hex characters joined with a hyphen
 * (e.g. `a1b2c-3d4e5`). Stored as sha256(code) — never plaintext. Single-use.
 */
import { authenticator } from 'otplib'
import { createHash, randomBytes } from 'node:crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { encryptString, decryptString } from '../lib/crypto'
import { env } from '../config/env'
import { UserModel } from '../models/User.model'

// 6-digit codes, ±1 step (=±30s) tolerance. Default issuer comes from env.
authenticator.options = { digits: 6, step: 30, window: 1 }

/** Issuer label shown in authenticator apps. */
export const TOTP_ISSUER = env.TOTP_ISSUER

/** Number of backup codes generated per enrollment. */
export const BACKUP_CODE_COUNT = 10

/** Generate a fresh base32 TOTP secret. */
export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

/** Build the otpauth:// URI for the given user + secret. */
export function buildOtpauthUrl(account: string, secret: string): string {
  return authenticator.keyuri(account, TOTP_ISSUER, secret)
}

/**
 * Verify a TOTP code, also rejecting replays of an already-accepted step.
 *
 * `otplib`'s `authenticator.check()` accepts a ±1 step window. We then
 * compute the current step counter and require it to be strictly greater
 * than the last one accepted for this user, defeating a code that's still
 * inside its 30-second window from being reused after success.
 *
 * @returns the accepted step counter on success, or `null` on failure.
 */
export function verifyTotpCode(
  code: string,
  secret: string,
  lastAcceptedStep: number,
): number | null {
  if (!authenticator.check(code, secret)) return null
  const currentStep = Math.floor(Date.now() / 1000 / 30)
  if (currentStep <= lastAcceptedStep) return null
  return currentStep
}

// ─── Encrypted secret storage ──────────────────────────────────────────────

export function encryptTotpSecret(plain: string): string {
  return encryptString(plain)
}

export function decryptTotpSecret(ciphertext: string): string {
  return decryptString(ciphertext)
}

// ─── Backup codes ──────────────────────────────────────────────────────────

/** Generate `n` backup codes in `xxxxx-xxxxx` lower-hex format. */
export function generateBackupCodes(n = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = []
  for (let i = 0; i < n; i++) {
    const buf = randomBytes(5)
    const left = buf.subarray(0, 5).toString('hex').slice(0, 5)
    const right = randomBytes(5).toString('hex').slice(0, 5)
    codes.push(`${left}-${right}`)
  }
  return codes
}

export function hashBackupCode(code: string): string {
  return createHash('sha256').update(code.trim().toLowerCase()).digest('hex')
}

// ─── 2FA challenge token (between login step 1 and step 2) ─────────────────

export const TWO_FACTOR_TOKEN_TTL_SECONDS = 5 * 60 // 5 minutes

/**
 * Sign a short-lived "2fa challenge" token. Bound to the user id and a fixed
 * `purpose` claim so it can never be used as an access / refresh token.
 */
export function sign2faChallengeToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: '2fa' }, env.JWT_ACCESS_SECRET, {
    expiresIn: TWO_FACTOR_TOKEN_TTL_SECONDS,
    audience: '2fa',
  } as SignOptions)
}

export interface TwoFactorChallengePayload {
  sub: string
  purpose: '2fa'
  iat?: number
  exp?: number
}

export function verify2faChallengeToken(token: string): TwoFactorChallengePayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    audience: '2fa',
  }) as TwoFactorChallengePayload
  if (payload.purpose !== '2fa' || !payload.sub) {
    throw new Error('Not a 2FA challenge token')
  }
  return payload
}

// ─── Persistence helpers ───────────────────────────────────────────────────

/**
 * Atomically consume a backup code (mark it `usedAt`). Returns true if the
 * code matched an unused entry. Constant-time-ish: hash first, then findOne.
 */
export async function consumeBackupCode(userId: string, code: string): Promise<boolean> {
  const hash = hashBackupCode(code)
  const result = await UserModel.updateOne(
    {
      _id: userId,
      twoFactorBackupCodes: { $elemMatch: { hash, usedAt: null } },
    },
    { $set: { 'twoFactorBackupCodes.$.usedAt': new Date() } },
  )
  return result.modifiedCount === 1
}
