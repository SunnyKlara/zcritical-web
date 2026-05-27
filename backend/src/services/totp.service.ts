/**
 * TOTP (RFC 6238) — Admin 2FA service.
 *
 * Design notes:
 *   - Algorithm: HMAC-SHA1, 30-second period, 6 digits — compatible with
 *     Google Authenticator, Microsoft Authenticator, Authy, 1Password.
 *   - Drift tolerance: ±1 window (30s before / 30s after) → ~90s usable code.
 *     Tighter than typical 2FA UX would feel jittery; looser is a security risk.
 *   - Secret: 20 random bytes (160 bits) → Base32-encoded → ~32 char string.
 *   - Recovery codes: 8 codes formatted XXXX-XXXX-XXXX (alphanum upper),
 *     stored as SHA-256 of the normalized form. One-time use.
 *
 * Why otpauth (not speakeasy / notp):
 *   - actively maintained, ESM friendly, no transitive deps.
 *   - returns deterministic Base32 secrets we can persist.
 */
import { randomBytes, createHash } from 'node:crypto'
import { TOTP, Secret } from 'otpauth'
import QRCode from 'qrcode'

const TOTP_ISSUER = 'Critical'
const TOTP_DIGITS = 6
const TOTP_PERIOD_SEC = 30
/** ±1 window of drift tolerance (30s before/after). */
const TOTP_DRIFT_WINDOWS = 1
const RECOVERY_CODE_COUNT = 8

/** Generate a fresh Base32 TOTP secret (160 bits / 20 bytes of entropy). */
export function generateTotpSecret(): string {
  // otpauth's Secret expects an ArrayBuffer, not a Node Buffer; copy bytes across.
  const buf = randomBytes(20)
  const ab = new ArrayBuffer(buf.byteLength)
  new Uint8Array(ab).set(buf)
  return new Secret({ buffer: ab }).base32
}

/**
 * Build the otpauth:// URI used by authenticator apps.
 * The `label` shows up in the user's app, so prefer `username@critical`.
 */
export function buildOtpauthUri(secretBase32: string, username: string): string {
  return new TOTP({
    issuer: TOTP_ISSUER,
    label: `${TOTP_ISSUER}:${username}`,
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SEC,
    secret: Secret.fromBase32(secretBase32),
  }).toString()
}

/** Render an otpauth URI as a base64 PNG data URL for inline display. */
export async function renderQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  })
}

/**
 * Verify a 6-digit TOTP code against the stored secret.
 * Accepts the current window plus ±DRIFT_WINDOWS.
 */
export function verifyTotp(secretBase32: string, code: string): boolean {
  const totp = new TOTP({
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SEC,
    secret: Secret.fromBase32(secretBase32),
  })
  // otpauth's validate() returns the delta (in periods) when matching, or null.
  const delta = totp.validate({ token: code, window: TOTP_DRIFT_WINDOWS })
  return delta !== null
}

const RECOVERY_BLOCK_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // omit ambiguous I,O,1,0

function generateRecoveryBlock(): string {
  const len = 4
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) {
    const byte = bytes[i] ?? 0
    out += RECOVERY_BLOCK_CHARS[byte % RECOVERY_BLOCK_CHARS.length]
  }
  return out
}

/** Produce 8 fresh recovery codes formatted XXXX-XXXX-XXXX. */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    return `${generateRecoveryBlock()}-${generateRecoveryBlock()}-${generateRecoveryBlock()}`
  })
}

/** Normalize before hash/compare so user input is dash- and case-insensitive. */
export function normalizeRecoveryCode(code: string): string {
  return code.trim().toUpperCase().replace(/-/g, '')
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex')
}

/** Hash an array of recovery codes for storage. */
export function hashRecoveryCodes(codes: string[]): string[] {
  return codes.map(hashRecoveryCode)
}
