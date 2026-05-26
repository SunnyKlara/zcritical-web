import { z } from 'zod'
import { FIRMWARE_CHANNELS, FIRMWARE_STATUSES, HARDWARE_VERSIONS } from '../constants'
import { IsoDateSchema, ObjectIdSchema } from './common.schema'

/** Semantic version validator (major.minor.patch). */
export const SemverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/, 'Invalid semantic version')

export const FirmwareSchema = z.object({
  _id: ObjectIdSchema.optional(),
  version: SemverSchema,
  channel: z.enum(FIRMWARE_CHANNELS).default('stable'),
  releaseNotes: z.object({
    zh: z.string(),
    en: z.string(),
  }),
  binaryUrl: z.string().min(1),
  binarySize: z.number().int().positive(),
  binaryHash: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be SHA256 hex'),
  hardwareVersions: z.array(z.enum(HARDWARE_VERSIONS)).min(1),
  minAppVersion: SemverSchema.optional(),
  rolloutPercent: z.number().int().min(0).max(100).default(100),
  status: z.enum(FIRMWARE_STATUSES).default('draft'),
  publishedAt: IsoDateSchema.optional(),
  createdAt: IsoDateSchema.optional(),
  updatedAt: IsoDateSchema.optional(),
})
export type Firmware = z.infer<typeof FirmwareSchema>

/** Public — APP polls this to check for updates. */
export const FirmwareCheckQuerySchema = z.object({
  serialNumber: z.string().trim().min(1).max(50),
  currentVersion: SemverSchema,
  hardwareVersion: z.enum(HARDWARE_VERSIONS),
  channel: z.enum(FIRMWARE_CHANNELS).default('stable'),
  appVersion: SemverSchema.optional(),
})
export type FirmwareCheckQuery = z.infer<typeof FirmwareCheckQuerySchema>

export const FirmwareCheckResponseSchema = z.object({
  hasUpdate: z.boolean(),
  latestVersion: SemverSchema.optional(),
  downloadUrl: z.string().url().optional(),
  hash: z.string().optional(),
  size: z.number().int().optional(),
  releaseNotes: z.object({ zh: z.string(), en: z.string() }).optional(),
})
export type FirmwareCheckResponse = z.infer<typeof FirmwareCheckResponseSchema>

/** Admin: create / update firmware metadata. Binary upload happens separately. */
export const CreateFirmwareRequestSchema = FirmwareSchema.omit({
  _id: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
})
export type CreateFirmwareRequest = z.infer<typeof CreateFirmwareRequestSchema>

export const UpdateFirmwareRequestSchema = CreateFirmwareRequestSchema.partial()
export type UpdateFirmwareRequest = z.infer<typeof UpdateFirmwareRequestSchema>
