import { Schema, model, type Document } from 'mongoose'
import { HARDWARE_VERSIONS, type HardwareVersion } from '@critical/shared'

export interface DeviceDocument extends Document {
  serialNumber: string
  email?: string
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
  createdAt: Date
  updatedAt: Date
}

const DeviceSchema = new Schema<DeviceDocument>(
  {
    serialNumber: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
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
  },
  { timestamps: true },
)

export const DeviceModel = model<DeviceDocument>('Device', DeviceSchema)
