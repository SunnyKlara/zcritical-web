import { Schema, model, type Document } from 'mongoose'
import {
  PAYMENT_EVENTS,
  PAYMENT_METHODS,
  type PaymentEventType,
  type PaymentMethod,
} from '@critical/shared'

export interface PaymentEventDocument extends Document {
  orderId: Schema.Types.ObjectId
  orderNo: string
  event: PaymentEventType
  provider: PaymentMethod
  providerId: string
  amount: number
  currency: string
  raw?: unknown
  ip?: string
  createdAt: Date
}

const PaymentEventSchema = new Schema<PaymentEventDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNo: { type: String, required: true },
    event: { type: String, enum: PAYMENT_EVENTS, required: true, index: true },
    provider: { type: String, enum: PAYMENT_METHODS, required: true },
    providerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    raw: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

PaymentEventSchema.index({ orderId: 1, createdAt: 1 })
PaymentEventSchema.index({ event: 1, createdAt: -1 })

export const PaymentEventModel = model<PaymentEventDocument>('PaymentEvent', PaymentEventSchema)
