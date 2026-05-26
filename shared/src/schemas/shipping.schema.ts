import { z } from 'zod'

/** Shipping address provided by the buyer at checkout. */
export const ShippingAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z
    .string()
    .trim()
    .length(2)
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Must be ISO 3166-1 alpha-2'),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
})
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>
