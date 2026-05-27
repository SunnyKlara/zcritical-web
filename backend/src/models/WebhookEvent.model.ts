import { Schema, model, type InferSchemaType } from 'mongoose'

/**
 * Tracks already-processed webhook deliveries (e.g. PayPal) so that replays
 * — whether legitimate retries or malicious — are detected and ignored.
 *
 * The unique compound index on (provider, transmissionId) is what guarantees
 * exactly-once processing semantics. TTL purges records after 30 days; this
 * is well beyond any provider's retry window.
 */
const webhookEventSchema = new Schema(
  {
    provider: { type: String, required: true },
    transmissionId: { type: String, required: true },
    eventType: { type: String, default: null },
    receivedAt: { type: Date, default: () => new Date(), index: true },
    /** Time-to-live for auto-purge (~30 days from receipt). */
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

webhookEventSchema.index({ provider: 1, transmissionId: 1 }, { unique: true })
webhookEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export type WebhookEventDoc = InferSchemaType<typeof webhookEventSchema>
export const WebhookEventModel = model('WebhookEvent', webhookEventSchema)
