import bcrypt from 'bcryptjs'
import { UserModel } from '../models/User.model'
import { env, isProd } from '../config/env'
import { logger } from '../config/logger'
import { checkPasswordStrength } from './password.service'

const BCRYPT_ROUNDS = 12

/** After this many consecutive failures the account is locked. */
export const MAX_FAILED_ATTEMPTS = 5
/** Lock duration in milliseconds. 15 minutes balances brute-force defense and admin UX. */
export const LOCKOUT_MS = 15 * 60 * 1000

/**
 * Minimal contract for "loginable user document" — defined structurally so
 * we don't fight Mongoose's generated types when fields can be null.
 */
export interface LoginableUserDoc {
  failedLoginAttempts?: number | null
  lockedUntil?: Date | null
  lastLoginAt?: Date | null
  save(): Promise<unknown>
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * Test whether a user is currently locked out. Cleans up the field if the
 * lock has expired so subsequent checks are O(1).
 */
export async function isLockedOut(user: LoginableUserDoc): Promise<boolean> {
  const lockedUntil = user.lockedUntil ?? null
  if (!lockedUntil) return false
  if (lockedUntil.getTime() > Date.now()) return true
  // Lock expired — reset.
  user.lockedUntil = null
  user.failedLoginAttempts = 0
  await user.save()
  return false
}

/**
 * Increment the failed-attempt counter and lock the account if it hits the
 * threshold. Always succeeds — never throws so the login route can branch
 * cleanly between bad-creds and locked-account responses.
 */
export async function recordFailedLogin(
  user: LoginableUserDoc,
): Promise<{ locked: boolean; lockedUntil?: Date }> {
  const attempts = (user.failedLoginAttempts ?? 0) + 1
  user.failedLoginAttempts = attempts
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const until = new Date(Date.now() + LOCKOUT_MS)
    user.lockedUntil = until
    await user.save()
    return { locked: true, lockedUntil: until }
  }
  await user.save()
  return { locked: false }
}

/** Reset failed counter + lock (call on successful authentication). */
export async function recordSuccessfulLogin(user: LoginableUserDoc): Promise<void> {
  user.failedLoginAttempts = 0
  user.lockedUntil = null
  user.lastLoginAt = new Date()
  await user.save()
}

/**
 * Ensures a default admin user exists on first run.
 * Idempotent: does nothing if an account with ADMIN_USERNAME is already present.
 */
export async function seedDefaultAdmin(): Promise<void> {
  const existing = await UserModel.findOne({ username: env.ADMIN_USERNAME }).lean()
  if (existing) return

  // In production, refuse to seed a weak default password — fail-fast nudges
  // operators to set a real `ADMIN_PASSWORD` in their secrets manager.
  if (isProd) {
    const check = checkPasswordStrength(env.ADMIN_PASSWORD, [env.ADMIN_USERNAME, env.ADMIN_EMAIL])
    if (!check.ok) {
      logger.fatal(
        { score: check.score, warning: check.feedback?.warning },
        'Refusing to seed admin: ADMIN_PASSWORD is too weak. Generate one with `openssl rand -base64 24`.',
      )
      throw new Error('ADMIN_PASSWORD too weak — see logs')
    }
  }

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD)
  await UserModel.create({
    username: env.ADMIN_USERNAME,
    email: env.ADMIN_EMAIL,
    passwordHash,
    role: 'admin',
    displayName: 'Administrator',
  })
  logger.info({ username: env.ADMIN_USERNAME }, 'Default admin user seeded')
}
