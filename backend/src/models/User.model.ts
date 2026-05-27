import { Schema, model, type InferSchemaType } from 'mongoose'
import { USER_ROLES } from '@critical/shared'

/**
 * Backup code entry. The hashed value is stored (never plaintext) and a
 * `usedAt` timestamp marks single-use consumption.
 */
const backupCodeSchema = new Schema(
  {
    hash: { type: String, required: true },
    usedAt: { type: Date, default: null },
  },
  { _id: false },
)

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'agent', required: true },
    displayName: { type: String, trim: true, maxlength: 100 },
    avatarUrl: { type: String },
    disabled: { type: Boolean, default: false, index: true },
    lastLoginAt: { type: Date },
    /** Monotonic counter bumped on logout / password change to invalidate older refresh tokens. */
    tokenVersion: { type: Number, default: 0 },

    // ── 2FA (TOTP) ───────────────────────────────────────────────────────────
    /** True once the user has finished enrollment (verified the first code). */
    twoFactorEnabled: { type: Boolean, default: false, index: true },
    /** AES-256-GCM encrypted base32 TOTP secret. Hidden by default. */
    twoFactorSecret: { type: String, select: false, default: null },
    /** Hashed (sha256) one-time backup recovery codes. */
    twoFactorBackupCodes: { type: [backupCodeSchema], select: false, default: [] },
    /** Last accepted TOTP step counter — prevents replay of the same code. */
    twoFactorLastStep: { type: Number, default: 0, select: false },

    // ── Account lockout ──────────────────────────────────────────────────────
    /** Consecutive failed login attempts since last success. */
    failedLoginAttempts: { type: Number, default: 0, select: false },
    /** When set in the future, login is rejected with 423 until that timestamp. */
    lockedUntil: { type: Date, default: null, select: false, index: true },
  },
  { timestamps: true },
)

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: unknown }
export const UserModel = model('User', userSchema)
