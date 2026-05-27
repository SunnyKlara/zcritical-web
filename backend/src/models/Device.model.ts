import { Schema, model, type Document } from 'mongoose'
import { HARDWARE_VERSIONS, type HardwareVersion } from '@critical/shared'
import { encryptedFieldsPlugin } from '../db/encrypted-fields.plugin'
import { emailBlindIndex } from '../lib/crypto'

export interface DeviceDocument extends Document {
  serialNumber: string
  email?: string
  /** Blind index of `email` (when present) for owner-style lookups. */
  emailHash?: string
  orderId?: Schema.Types.ObjectId
  hardwareVersion: HardwareVersion
  firmwareVersion: string
  appVersion?: string
  activatedAt?: Date
  lastSeenAt?: Date
  metadata?: {
    region?: string
    customLogos?: string[]
  }
  scheduledDeleteAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const DeviceSchema = new Schema<DeviceDocument>(
  {
    serialNumber: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    emailHash: { type: String, index: true, select: false },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    hardwareVersion: { type: String, enum: HARDWARE_VERSIONS, required: true },
    firmwareVersion: { type: String, required: true },
    appVersion: { type: String },
    activatedAt: { type: Date },
    lastSeenAt: { type: Date, index: true },
    metadata: {
      region: { type: String },
      customLogos: { type: [String] },
    },
    /** Set by GDPR delete request; cron worker hard-deletes once elapsed. */
    scheduledDeleteAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
)

DeviceSchema.pre('validate', function setEmailHash(next) {
  const doc = this as unknown as DeviceDocument & { isModified(p: string): boolean }
  if (typeof doc.email === 'string' && doc.email && (doc.isNew || doc.isModified('email'))) {
    doc.emailHash = emailBlindIndex('device.email', doc.email)
  }
  next()
})

DeviceSchema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  function setEmailHashOnUpdate(next) {
    const update = (
      this as unknown as {
        getUpdate(): Record<string, unknown> | null
      }
    ).getUpdate()
    if (!update) return next()
    const set = (update.$set as Record<string, unknown>) ?? update
    const newEmail = set.email
    if (typeof newEmail === 'string' && newEmail) {
      set.emailHash = emailBlindIndex('device.email', newEmail)
      if (update !== set) update.$set = set
      ;(this as unknown as { setUpdate(u: unknown): void }).setUpdate(update)
    }
    next()
  },
)

DeviceSchema.plugin(encryptedFieldsPlugin, {
  fields: ['email'],
})

export const DeviceModel = model<DeviceDocument>('Device', DeviceSchema)
