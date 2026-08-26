import { Schema, model, type InferSchemaType } from 'mongoose'
import { USER_ROLES } from '@critical/shared'

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

    /**
     * TOTP 2FA — Base32-encoded secret. `select: false` so it never leaks into
     * generic find() queries. Kept null until activated.
     * TODO(W4-PII): encrypt at rest once PII encryption epic lands.
     */
    totpSecret: { type: String, default: null, select: false },
    /** Whether 2FA is currently active. Independent flag so we can clear secret without losing intent. */
    totpEnabled: { type: Boolean, default: false, index: true },
    /** Time of activation, for audit. */
    totpActivatedAt: { type: Date, default: null },
    /**
     * One-time recovery codes. Stored SHA-256 hashed (never plaintext).
     * On consumption, the matching entry is spliced out.
     */
    totpRecoveryCodeHashes: { type: [String], default: [], select: false },
  },
  { timestamps: true },
)

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: unknown }
export const UserModel = model('User', userSchema)
