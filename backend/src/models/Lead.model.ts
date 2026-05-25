import { Schema, model, type Document } from 'mongoose'
import { LEAD_STATUSES, type LeadStatus } from '@critical/shared'

export interface LeadDocument extends Document {
  name: string
  email: string
  company?: string
  phone?: string
  message: string
  source?: string
  locale?: string
  ip?: string
  userAgent?: string
  status: LeadStatus
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const LeadSchema = new Schema<LeadDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true },
    company: { type: String, trim: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 40 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    source: { type: String, trim: true, maxlength: 40 },
    locale: { type: String, trim: true, maxlength: 8 },
    ip: { type: String },
    userAgent: { type: String },
    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    notes: { type: String },
  },
  { timestamps: true },
)

LeadSchema.index({ createdAt: -1 })
LeadSchema.index({ email: 1 })

export const LeadModel = model<LeadDocument>('Lead', LeadSchema)
