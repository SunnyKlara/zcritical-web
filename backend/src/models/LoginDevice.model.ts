import { Schema, model, type InferSchemaType } from 'mongoose'

/**
 * Tracks the (user, device) pairs that have successfully logged in.
 *
 * "Device" is approximated by SHA-256 of (userAgent || ip-prefix). This is
 * deliberately fuzzy — we want it to be invariant across the user's normal
 * IP changes (DHCP / VPN) while still flagging genuinely new contexts.
 *
 * Used by the new-device login alert: when an authenticated login produces a
 * fingerprint that has never been seen for this user, fire an email warning.
 */
const loginDeviceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fingerprintHash: { type: String, required: true, index: true },
    /** Coarse-grained IP (first three octets / IPv6 /48) for the email body. */
    ipPrefix: { type: String, default: null },
    userAgent: { type: String, default: null },
    firstSeenAt: { type: Date, default: () => new Date() },
    lastSeenAt: { type: Date, default: () => new Date(), index: true },
    loginCount: { type: Number, default: 1 },
  },
  { timestamps: true },
)

loginDeviceSchema.index({ userId: 1, fingerprintHash: 1 }, { unique: true })

export type LoginDeviceDoc = InferSchemaType<typeof loginDeviceSchema>
export const LoginDeviceModel = model('LoginDevice', loginDeviceSchema)
