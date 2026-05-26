import { z } from 'zod'
import { PAYMENT_EVENTS, PAYMENT_METHODS } from '../constants'
import { IsoDateSchema, ObjectIdSchema } from './common.schema'

export const PaymentEventSchema = z.object({
  _id: ObjectIdSchema.optional(),
  orderId: ObjectIdSchema,
  orderNo: z.string(),
  event: z.enum(PAYMENT_EVENTS),
  provider: z.enum(PAYMENT_METHODS),
  providerId: z.string(),
  amount: z.number().int().min(0),
  currency: z.literal('USD').default('USD'),
  raw: z.unknown().optional(),
  ip: z.string().optional(),
  createdAt: IsoDateSchema.optional(),
})
export type PaymentEvent = z.infer<typeof PaymentEventSchema>
