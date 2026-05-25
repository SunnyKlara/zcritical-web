import { z } from 'zod'
import { IsoDateSchema, ObjectIdSchema } from './common.schema'

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

/**
 * What the public form POSTs.
 * `website` is a honeypot — bots fill it, humans don't. Server returns 202 if non-empty.
 */
export const CreateLeadRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  company: z.string().trim().max(200).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  message: z.string().trim().min(1).max(2000),
  source: z.string().trim().max(40).optional(),
  // Honeypot — bots fill it, route returns 202 silently.
  website: z.string().optional(),
  locale: z.enum(['zh', 'en']).optional(),
})
export type CreateLeadRequest = z.infer<typeof CreateLeadRequestSchema>

export const LeadSchema = z.object({
  _id: ObjectIdSchema.optional(),
  name: z.string(),
  email: z.string(),
  company: z.string().optional(),
  phone: z.string().optional(),
  message: z.string(),
  source: z.string().optional(),
  locale: z.string().optional(),
  status: z.enum(LEAD_STATUSES).default('new'),
  notes: z.string().optional(),
  createdAt: IsoDateSchema.optional(),
  updatedAt: IsoDateSchema.optional(),
})
export type Lead = z.infer<typeof LeadSchema>

export const UpdateLeadRequestSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().trim().max(5000).optional(),
})
export type UpdateLeadRequest = z.infer<typeof UpdateLeadRequestSchema>
