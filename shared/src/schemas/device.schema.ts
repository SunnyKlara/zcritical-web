import { z } from 'zod'
import { HARDWARE_VERSIONS } from '../constants'
import { EmailSchema, IsoDateSchema, ObjectIdSchema } from './common.schema'
import { SemverSchema } from './firmware.schema'

export const DeviceSchema = z.object({
  _id: ObjectIdSchema.optional(),
  serialNumber: z.string().trim().min(1).max(50),
  email: EmailSchema.optional(),
  orderId: ObjectIdSchema.optional(),
  hardwareVersion: z.enum(HARDWARE_VERSIONS),
  firmwareVersion: SemverSchema,
  appVersion: SemverSchema.optional(),
  activatedAt: IsoDateSchema.optional(),
  lastSeenAt: IsoDateSchema.optional(),
  metadata: z
    .object({
      region: z.string().optional(),
      customLogos: z.array(z.string()).optional(),
    })
    .optional(),
  createdAt: IsoDateSchema.optional(),
  updatedAt: IsoDateSchema.optional(),
})
export type Device = z.infer<typeof DeviceSchema>

/** Public: device activation request (called by APP). */
export const ActivateDeviceRequestSchema = z.object({
  serialNumber: z.string().trim().min(1).max(50),
  email: EmailSchema,
  hardwareVersion: z.enum(HARDWARE_VERSIONS),
  firmwareVersion: SemverSchema,
  appVersion: SemverSchema.optional(),
})
export type ActivateDeviceRequest = z.infer<typeof ActivateDeviceRequestSchema>

/** Heartbeat from device (every 24h). */
export const DeviceHeartbeatRequestSchema = z.object({
  serialNumber: z.string().trim().min(1).max(50),
  firmwareVersion: SemverSchema,
  appVersion: SemverSchema.optional(),
})
export type DeviceHeartbeatRequest = z.infer<typeof DeviceHeartbeatRequestSchema>
