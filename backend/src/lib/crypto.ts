/**
 * AES-256-GCM symmetric encryption for sensitive at-rest fields
 * (e.g. TOTP secrets, refresh-cookie HMAC inputs).
 *
 * Key resolution order:
 *   1. `process.env.ENCRYPTION_KEY` — 64-char hex (32 bytes), preferred.
 *   2. HKDF-SHA256(JWT_ACCESS_SECRET, "critical-encryption-v1") — fallback so
 *      dev / test never crash on missing config. Logs a warning in production.
 *
 * Output format (single string):
 *   "v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>"
 *
 * The `v1` prefix lets us rotate algorithms in the future without breaking
 * stored data.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { env, isProd } from '../config/env'
import { logger } from '../config/logger'

const ALGO = 'aes-256-gcm'
const KEY_BYTES = 32
const IV_BYTES = 12 // GCM standard
const TAG_BYTES = 16
const VERSION = 'v1'

let cachedKey: Buffer | null = null

function resolveKey(): Buffer {
  if (cachedKey) return cachedKey

  const explicit = process.env.ENCRYPTION_KEY?.trim()
  if (explicit) {
    if (!/^[0-9a-fA-F]{64}$/.test(explicit)) {
      throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
    }
    cachedKey = Buffer.from(explicit, 'hex')
    return cachedKey
  }

  if (isProd) {
    logger.warn(
      'ENCRYPTION_KEY not set in production — deriving from JWT_ACCESS_SECRET. ' +
        'This works but rotating JWT secrets will break encrypted at-rest data. ' +
        'Set a dedicated ENCRYPTION_KEY (openssl rand -hex 32) before storing PII.',
    )
  }

  const ikm = Buffer.from(env.JWT_ACCESS_SECRET, 'utf8')
  const salt = Buffer.from('critical-app-salt-v1', 'utf8')
  const info = Buffer.from('critical-encryption-v1', 'utf8')
  const derived = hkdfSync('sha256', ikm, salt, info, KEY_BYTES) as ArrayBuffer
  cachedKey = Buffer.from(derived)
  return cachedKey
}

/** Encrypt a UTF-8 string. Returns a self-describing ciphertext string. */
export function encryptString(plaintext: string): string {
  const key = resolveKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':')
}

/** Decrypt a string produced by `encryptString`. Throws on tampering. */
export function decryptString(ciphertext: string): string {
  const parts = ciphertext.split(':')
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Invalid ciphertext format')
  }
  const [, ivHex, tagHex, dataHex] = parts as [string, string, string, string]
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('Invalid ciphertext component lengths')
  }
  const key = resolveKey()
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString('utf8')
}

/** Constant-time compare two same-length strings. */
export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/** Generate N random hex bytes (default 16 → 32 hex chars). Useful for backup-code seeds. */
export function randomHex(bytes = 16): string {
  return randomBytes(bytes).toString('hex')
}

// ─── Blind index ────────────────────────────────────────────────────────────

/**
 * Domain-separated HMAC for "blind index" lookups over encrypted fields.
 *
 * Use case: a column like `email` is encrypted at rest (so a DB dump can't
 * be grepped), but we still need exact-match lookups (`SELECT WHERE email=?`).
 * The trick is to store an additional column `email_hash = bindIndex('email', email)`,
 * indexed and queryable. Same input → same hash, but the hash leaks no info
 * beyond "two records share this field value".
 *
 * The `domain` separator (e.g. `'lead.email'`, `'order.email'`) prevents
 * cross-table rainbow tables. Output is lowercase hex of HMAC-SHA256.
 */
export function blindIndex(domain: string, value: string): string {
  const key = resolveKey()
  return createHmac('sha256', key).update(`${domain}:${value}`).digest('hex')
}

/** Helper that lower-cases + trims an email before hashing. */
export function emailBlindIndex(domain: string, email: string): string {
  return blindIndex(domain, email.trim().toLowerCase())
}

/** True if the supplied string matches our `v1:iv:tag:ct` ciphertext format. */
export function looksEncrypted(s: unknown): s is string {
  return typeof s === 'string' && /^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(s)
}
