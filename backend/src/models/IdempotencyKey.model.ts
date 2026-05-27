import { Schema, model, type InferSchemaType } from 'mongoose'

/**
 * Idempotency record — caches the response of a non-safe request keyed by
 * `(scope, key)`. Subsequent identical requests within `expiresAt` return the
 * cached response without re-executing the handler.
 *
 * `bodyHash` lets us reject "same key, different payload" attacks.
 */
const idempotencyKeySchema = new Schema(
  {
    scope: { type: String, required: true, index: true },
    key: { type: String, required: true, index: true },
    bodyHash: { type: String, required: true },
    statusCode: { type: Number, required: true },
    response: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

idempotencyKeySchema.index({ scope: 1, key: 1 }, { unique: true })
// MongoDB TTL index — auto-prune expired records.
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export type IdempotencyKeyDoc = InferSchemaType<typeof idempotencyKeySchema>
export const IdempotencyKeyModel = model('IdempotencyKey', idempotencyKeySchema)
