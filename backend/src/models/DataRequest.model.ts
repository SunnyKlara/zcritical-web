import { Schema, model, type InferSchemaType } from 'mongoose'

/**
 * GDPR / CCPA "data subject" request — covers both **access** (export) and
 * **erasure** (delete) flows. The same user-facing API drives both.
 *
 * Identity is proven via a one-time-password emailed to the address being
 * requested; we never bind requests to a logged-in account because there is
 * no end-user account model (only admin).
 *
 * State machine:
 *   pending  — OTP sent, waiting for verification
 *   verified — OTP verified; for `export` the download is materialized; for
 *              `delete` the records' `deletedAt` is set 30 days in the future
 *   completed — export download was issued OR deletion grace expired and
 *               hard-delete was performed
 *   cancelled — user cancelled a pending deletion before grace expired
 *
 * The OTP is stored as a sha256 hash, never plaintext, and expires in 15 min.
 */
const dataRequestSchema = new Schema(
  {
    kind: { type: String, enum: ['export', 'delete'], required: true, index: true },
    /** Blind index of the requesting email, so queries don't need plaintext. */
    emailHash: { type: String, required: true, index: true },
    /** Encrypted email — only decrypted server-side when emailing the user. */
    email: { type: String, required: true },
    /** sha256 of the OTP. */
    otpHash: { type: String, required: true, select: false },
    otpExpiresAt: { type: Date, required: true },
    /** Number of failed verification attempts; aborts at 5. */
    attempts: { type: Number, default: 0, select: false },
    status: {
      type: String,
      enum: ['pending', 'verified', 'completed', 'cancelled', 'failed'],
      default: 'pending',
      index: true,
    },
    /** For `delete` requests: when the soft-delete becomes hard. */
    scheduledDeleteAt: { type: Date, index: true },
    /** For `export` requests: ephemeral download token (JWT). */
    downloadToken: { type: String, select: false },
    completedAt: { type: Date },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
)

dataRequestSchema.index({ status: 1, scheduledDeleteAt: 1 })
dataRequestSchema.index({ status: 1, otpExpiresAt: 1 })

export type DataRequestDoc = InferSchemaType<typeof dataRequestSchema>
export const DataRequestModel = model('DataRequest', dataRequestSchema)
