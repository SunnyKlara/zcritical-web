import { Schema, model, type InferSchemaType } from 'mongoose'
import { MESSAGE_SENDERS } from '@critical/shared'

const messageSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    sender: { type: String, enum: MESSAGE_SENDERS, required: true },
    content: { type: String, required: true, maxlength: 2000 },
    visitorInfo: {
      name: { type: String, maxlength: 100 },
      email: { type: String, maxlength: 200 },
    },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

messageSchema.index({ sessionId: 1, createdAt: 1 })

export type MessageDoc = InferSchemaType<typeof messageSchema>
export const MessageModel = model('Message', messageSchema)
