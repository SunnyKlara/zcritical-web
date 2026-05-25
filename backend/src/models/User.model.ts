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
  },
  { timestamps: true },
)

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: unknown }
export const UserModel = model('User', userSchema)
