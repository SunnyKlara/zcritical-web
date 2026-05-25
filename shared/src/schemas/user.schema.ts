import { z } from 'zod'
import { USER_ROLES } from '../constants'
import { EmailSchema, IsoDateSchema, ObjectIdSchema } from './common.schema'

/** Admin / agent user (backend only; never expose passwordHash to client). */
export const UserSchema = z.object({
  _id: ObjectIdSchema.optional(),
  username: z.string().trim().min(3).max(50),
  email: EmailSchema,
  role: z.enum(USER_ROLES).default('agent'),
  displayName: z.string().trim().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  disabled: z.boolean().default(false),
  lastLoginAt: IsoDateSchema.optional(),
  createdAt: IsoDateSchema.optional(),
  updatedAt: IsoDateSchema.optional(),
})
export type User = z.infer<typeof UserSchema>

/** Public-safe user projection returned to the client. */
export const PublicUserSchema = UserSchema
export type PublicUser = z.infer<typeof PublicUserSchema>
