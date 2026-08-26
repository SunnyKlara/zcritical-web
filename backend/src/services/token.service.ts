import { randomUUID, createHmac } from 'node:crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'
import type {
  AccessTokenPayload,
  MfaTokenPayload,
  RefreshTokenPayload,
  VisitorSessionPayload,
} from '@critical/shared'

type AccessClaims = Omit<AccessTokenPayload, 'iat' | 'exp'>
type RefreshClaims = Omit<RefreshTokenPayload, 'iat' | 'exp'>
type MfaClaims = Omit<MfaTokenPayload, 'iat' | 'exp'>

/**
 * Derive a separate signing key for visitor session tokens so they can never
 * be confused with admin access tokens. Uses HMAC-SHA256 of the access secret
 * with a fixed context string.
 */
const VISITOR_SESSION_SECRET = createHmac('sha256', env.JWT_ACCESS_SECRET)
  .update('visitor-session-v1')
  .digest('hex')

/**
 * Same trick for the short-lived MFA bridge token. Distinct from access/refresh
 * so a leaked mfaToken cannot be replayed as either, and vice versa.
 */
const MFA_TOKEN_SECRET = createHmac('sha256', env.JWT_ACCESS_SECRET)
  .update('mfa-bridge-v1')
  .digest('hex')

/** 5-minute window between password OK and TOTP submitted. */
const MFA_TOKEN_TTL = '5m'

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as SignOptions)
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload
  if (!payload.sub || !payload.role || !payload.username) {
    throw new Error('Token payload is not an admin access token')
  }
  return payload
}

export function signRefreshToken(
  sub: string,
  jti: string = randomUUID(),
): {
  token: string
  jti: string
} {
  const claims: RefreshClaims = { sub, jti }
  const token = jwt.sign(claims, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as SignOptions)
  return { token, jti }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload
}

export function signVisitorSession(sessionId: string): string {
  const claims: Omit<VisitorSessionPayload, 'iat' | 'exp'> = { sessionId }
  return jwt.sign(claims, VISITOR_SESSION_SECRET, { expiresIn: '30d' } as SignOptions)
}

export function verifyVisitorSession(token: string): VisitorSessionPayload {
  return jwt.verify(token, VISITOR_SESSION_SECRET) as VisitorSessionPayload
}

/**
 * Issue a short-lived MFA bridge token. Returned to the client after a
 * successful password check on a 2FA-enabled account; consumed at /verify-2fa.
 *
 * `jti` is unique per token — used as cache key for per-token attempt counting
 * so a stolen mfaToken cannot be brute-forced offline by repeated TOTP guesses.
 */
export function signMfaToken(
  sub: string,
  jti: string = randomUUID(),
): { token: string; jti: string } {
  const claims: MfaClaims = { sub, jti, purpose: 'mfa' }
  const token = jwt.sign(claims, MFA_TOKEN_SECRET, { expiresIn: MFA_TOKEN_TTL } as SignOptions)
  return { token, jti }
}

export function verifyMfaToken(token: string): MfaTokenPayload {
  const payload = jwt.verify(token, MFA_TOKEN_SECRET) as MfaTokenPayload
  if (payload.purpose !== 'mfa') {
    throw new Error('Token is not an MFA bridge token')
  }
  return payload
}
