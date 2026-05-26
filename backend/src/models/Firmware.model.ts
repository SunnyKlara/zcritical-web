import { Schema, model, type Document } from 'mongoose'
import {
  FIRMWARE_CHANNELS,
  FIRMWARE_STATUSES,
  HARDWARE_VERSIONS,
  type FirmwareChannel,
  type FirmwareStatus,
  type HardwareVersion,
} from '@critical/shared'

export interface FirmwareDocument extends Document {
  version: string
  channel: FirmwareChannel
  releaseNotes: { zh: string; en: string }
  binaryUrl: string
  binarySize: number
  binaryHash: string
  hardwareVersions: HardwareVersion[]
  minAppVersion?: string
  rolloutPercent: number
  status: FirmwareStatus
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const FirmwareSchema = new Schema<FirmwareDocument>(
  {
    version: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/,
    },
    channel: { type: String, enum: FIRMWARE_CHANNELS, default: 'stable', index: true },
    releaseNotes: {
      zh: { type: String, required: true },
      en: { type: String, required: true },
    },
    binaryUrl: { type: String, required: true },
    binarySize: { type: Number, required: true, min: 0 },
    binaryHash: {
      type: String,
      required: true,
      match: /^[a-f0-9]{64}$/i,
    },
    hardwareVersions: {
      type: [String],
      enum: HARDWARE_VERSIONS,
      validate: (v: unknown[]) => v.length > 0,
    },
    minAppVersion: { type: String, match: /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/ },
    rolloutPercent: { type: Number, min: 0, max: 100, default: 100 },
    status: { type: String, enum: FIRMWARE_STATUSES, default: 'draft', index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
)

FirmwareSchema.index({ channel: 1, status: 1, publishedAt: -1 })

export const FirmwareModel = model<FirmwareDocument>('Firmware', FirmwareSchema)
