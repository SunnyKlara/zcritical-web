import { Schema, model, type Document } from 'mongoose'
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  type OrderStatus,
  type PaymentMethod,
} from '@critical/shared'

export interface OrderItemDoc {
  productId: Schema.Types.ObjectId
  sku: string
  name: string
  price: number
  quantity: number
  image: string
}

export interface OrderDocument extends Document {
  orderNo: string
  email: string
  status: OrderStatus
  items: OrderItemDoc[]
  subtotal: number
  shipping: number
  total: number
  currency: string
  shippingAddress: {
    fullName: string
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
    phone?: string
  }
  payment: {
    method: PaymentMethod
    paypalOrderId?: string
    paypalCaptureId?: string
    paidAt?: Date
  }
  fulfillment?: {
    carrier?: string
    trackingNo?: string
    shippedAt?: Date
    trackingUrl?: string
  }
  locale: 'en' | 'zh'
  ip?: string
  userAgent?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, required: true },
  },
  { _id: false },
)

const OrderSchema = new Schema<OrderDocument>(
  {
    orderNo: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment', index: true },
    items: { type: [OrderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', enum: ['USD'] },
    shippingAddress: {
      fullName: { type: String, required: true, trim: true },
      line1: { type: String, required: true, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true, uppercase: true, maxlength: 2 },
      phone: { type: String, trim: true },
    },
    payment: {
      method: { type: String, enum: PAYMENT_METHODS, required: true },
      paypalOrderId: { type: String, index: true },
      paypalCaptureId: { type: String },
      paidAt: { type: Date },
    },
    fulfillment: {
      carrier: { type: String, trim: true },
      trackingNo: { type: String, trim: true },
      shippedAt: { type: Date },
      trackingUrl: { type: String, trim: true },
    },
    locale: { type: String, enum: ['en', 'zh'], default: 'en' },
    ip: { type: String },
    userAgent: { type: String },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
)

OrderSchema.index({ email: 1, orderNo: 1 })
OrderSchema.index({ status: 1, createdAt: -1 })
OrderSchema.index({ createdAt: -1 })

export const OrderModel = model<OrderDocument>('Order', OrderSchema)
