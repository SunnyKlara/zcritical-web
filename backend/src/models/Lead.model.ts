import { Schema, model, type Document } from 'mongoose'
import { LEAD_STATUSES, type LeadStatus } from '@critical/shared'
import { encryptedFieldsPlugin } from '../db/encrypted-fields.plugin'
import { emailBlindIndex } from '../lib/crypto'

export interface LeadDocument extends Document {
  name: string
  email: string
  /** HMAC blind index of `email` — never returned to clients. Indexed for lookups. */
  emailHash: string
  company?: string
  phone?: string
  message: string
  source?: string
  locale?: string
  ip?: string
  userAgent?: string
  status: LeadStatus
  notes?: string
  scheduledDeleteAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const LeadSchema = new Schema<LeadDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true },
    emailHash: { type: String, required: true, index: true, select: false },
    company: { type: String, trim: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 40 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    source: { type: String, trim: true, maxlength: 40 },
    locale: { type: String, trim: true, maxlength: 8 },
    ip: { type: String },
    userAgent: { type: String },
    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    notes: { type: String },
    /** Set by GDPR delete request; cron worker hard-deletes once elapsed. */
    scheduledDeleteAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
)

LeadSchema.index({ createdAt: -1 })
// Note: removed the plaintext-email index. Once `email` is encrypted, an
// index on it would only ever match against ciphertext.

/**
 * Maintain `emailHash` automatically on every save / atomic update so callers
 * can find leads by email without ever surfacing the plaintext to MongoDB.
 */
LeadSchema.pre('validate', function setEmailHash(next) {
  const doc = this as unknown as LeadDocument & { isModified(p: string): boolean }
  if (typeof doc.email === 'string' && (doc.isNew || doc.isModified('email'))) {
    doc.emailHash = emailBlindIndex('lead.email', doc.email)
  }
  next()
})

LeadSchema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  function setEmailHashOnUpdate(next) {
    const update = (this as unknown as { getUpdate(): Record<string, unknown> | null }).getUpdate()
    if (!update) return next()
    const set = (update.$set as Record<string, unknown>) ?? update
    const newEmail = set.email
    if (typeof newEmail === 'string') {
      set.emailHash = emailBlindIndex('lead.email', newEmail)
      if (update !== set) update.$set = set
      ;(this as unknown as { setUpdate(u: unknown): void }).setUpdate(update)
    }
    next()
  },
)

// PII at rest: encrypt name, email, phone, message. Status / timestamps stay
// queryable. The `emailHash` blind-index column lets us still find by email.
LeadSchema.plugin(encryptedFieldsPlugin, {
  fields: ['name', 'email', 'phone', 'message'],
})

export const LeadModel = model<LeadDocument>('Lead', LeadSchema)
