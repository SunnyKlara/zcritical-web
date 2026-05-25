import { Schema, model, type InferSchemaType } from 'mongoose'
import { SESSION_STATUSES } from '@critical/shared'

const sessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: SESSION_STATUSES, default: 'open', index: true },
    visitorInfo: {
      name: { type: String, maxlength: 100 },
      email: { type: String, maxlength: 200 },
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: String, maxlength: 2000 },
    lastMessageAt: { type: Date, index: true },
    unreadCount: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    source: {
      page: String,
      referrer: String,
      utm: { type: Map, of: String },
    },
  },
  { timestamps: true },
)

sessionSchema.index({ status: 1, lastMessageAt: -1 })

export type SessionDoc = InferSchemaType<typeof sessionSchema>
export const SessionModel = model('Session', sessionSchema)
