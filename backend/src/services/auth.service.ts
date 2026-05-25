import bcrypt from 'bcryptjs'
import { UserModel } from '../models/User.model'
import { env } from '../config/env'
import { logger } from '../config/logger'

const BCRYPT_ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * Ensures a default admin user exists on first run.
 * Idempotent: does nothing if an account with ADMIN_USERNAME is already present.
 */
export async function seedDefaultAdmin(): Promise<void> {
  const existing = await UserModel.findOne({ username: env.ADMIN_USERNAME }).lean()
  if (existing) return
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
