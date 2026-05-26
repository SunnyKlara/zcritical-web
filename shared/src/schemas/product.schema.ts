import { z } from 'zod'
import { PRODUCT_STATUSES } from '../constants'
import { IsoDateSchema, ObjectIdSchema } from './common.schema'

/** Localized string (zh + en). */
export const LocaleStringSchema = z.object({
  zh: z.string().trim().min(1),
  en: z.string().trim().min(1),
})
export type LocaleString = z.infer<typeof LocaleStringSchema>

/** Product variant (color / edition). */
export const ProductVariantSchema = z.object({
  sku: z.string().trim().min(1).max(30),
  name: LocaleStringSchema,
  stock: z.number().int().min(0).default(0),
  image: z.string().trim().min(1),
  weight: z.number().int().positive().optional(),
})
export type ProductVariant = z.infer<typeof ProductVariantSchema>

/** Full product document. */
export const ProductSchema = z.object({
  _id: ObjectIdSchema.optional(),
  name: LocaleStringSchema,
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug'),
  description: LocaleStringSchema,
  price: z.number().int().positive(), // cents
  compareAtPrice: z.number().int().positive().optional(),
  currency: z.literal('USD').default('USD'),
  variants: z.array(ProductVariantSchema).min(1),
  images: z.array(z.string()).default([]),
  weight: z.number().int().positive(), // grams
  dimensions: z.object({
    length: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  status: z.enum(PRODUCT_STATUSES).default('draft'),
  featured: z.boolean().default(false),
  createdAt: IsoDateSchema.optional(),
  updatedAt: IsoDateSchema.optional(),
})
export type Product = z.infer<typeof ProductSchema>

export const CreateProductRequestSchema = ProductSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
})
export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>

export const UpdateProductRequestSchema = CreateProductRequestSchema.partial()
export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>
