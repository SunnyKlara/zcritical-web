import { Schema, model, type Document } from 'mongoose'
import { PRODUCT_STATUSES, type ProductStatus } from '@critical/shared'

export interface ProductVariantDoc {
  sku: string
  name: { zh: string; en: string }
  stock: number
  image: string
  weight?: number
}

export interface ProductDocument extends Document {
  name: { zh: string; en: string }
  slug: string
  description: { zh: string; en: string }
  price: number
  compareAtPrice?: number
  currency: string
  variants: ProductVariantDoc[]
  images: string[]
  weight: number
  dimensions: { length: number; width: number; height: number }
  status: ProductStatus
  featured: boolean
  createdAt: Date
  updatedAt: Date
}

const LocaleStringSubSchema = {
  zh: { type: String, required: true, trim: true },
  en: { type: String, required: true, trim: true },
}

const ProductVariantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true, maxlength: 30 },
    name: LocaleStringSubSchema,
    stock: { type: Number, required: true, min: 0, default: 0 },
    image: { type: String, required: true, trim: true },
    weight: { type: Number, min: 0 },
  },
  { _id: false },
)

const ProductSchema = new Schema<ProductDocument>(
  {
    name: LocaleStringSubSchema,
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
    },
    description: LocaleStringSubSchema,
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', enum: ['USD'] },
    variants: {
      type: [ProductVariantSchema],
      required: true,
      validate: (v: unknown[]) => v.length > 0,
    },
    images: { type: [String], default: [] },
    weight: { type: Number, required: true, min: 0 },
    dimensions: {
      length: { type: Number, required: true, min: 0 },
      width: { type: Number, required: true, min: 0 },
      height: { type: Number, required: true, min: 0 },
    },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'draft', index: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
)

ProductSchema.index({ 'variants.sku': 1 }, { unique: true })
ProductSchema.index({ status: 1, featured: -1 })

export const ProductModel = model<ProductDocument>('Product', ProductSchema)
