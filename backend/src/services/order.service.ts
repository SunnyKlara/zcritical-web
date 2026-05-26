import { ProductModel, type ProductDocument } from '../models/Product.model'
import { getShippingRate } from '../config/shipping'
import { AppError } from '../middleware/error.middleware'
import type { CreateOrderRequest } from '@critical/shared'

export interface PricedOrder {
  items: {
    productId: string
    sku: string
    name: string
    price: number
    quantity: number
    image: string
  }[]
  subtotal: number
  shipping: number
  total: number
}

/**
 * Validate an incoming order request, look up products + variants, and
 * return a fully priced snapshot ready to persist.
 *
 * Throws AppError on any validation failure (out of stock, invalid SKU,
 * archived product, etc.) so the route can return a clean 4xx response.
 */
export async function priceOrderRequest(
  req: CreateOrderRequest,
): Promise<PricedOrder> {
  // Build a unique set of SKUs to fetch all relevant products in one query
  const skus = req.items.map((i) => i.sku)
  const products = await ProductModel.find({
    'variants.sku': { $in: skus },
  }).lean()

  // Index variants by SKU for O(1) lookup
  const variantBySku = new Map<
    string,
    { product: ProductDocument; variant: ProductDocument['variants'][number] }
  >()
  for (const product of products as unknown as ProductDocument[]) {
    for (const variant of product.variants) {
      if (skus.includes(variant.sku)) {
        variantBySku.set(variant.sku, { product, variant })
      }
    }
  }

  const items: PricedOrder['items'] = []
  let subtotal = 0

  for (const reqItem of req.items) {
    const found = variantBySku.get(reqItem.sku)
    if (!found) {
      throw new AppError(400, `Unknown SKU: ${reqItem.sku}`, 'SKU_NOT_FOUND')
    }
    const { product, variant } = found

    if (product.status !== 'active') {
      throw new AppError(400, `Product unavailable: ${reqItem.sku}`, 'PRODUCT_UNAVAILABLE')
    }
    if (variant.stock < reqItem.quantity) {
      throw new AppError(
        400,
        `Insufficient stock for ${reqItem.sku}: have ${variant.stock}, need ${reqItem.quantity}`,
        'INSUFFICIENT_STOCK',
      )
    }

    const localizedName = product.name[req.locale] ?? product.name.en
    const variantName = variant.name[req.locale] ?? variant.name.en

    items.push({
      productId: String(product._id),
      sku: variant.sku,
      name: `${localizedName} — ${variantName}`,
      price: product.price,
      quantity: reqItem.quantity,
      image: variant.image,
    })

    subtotal += product.price * reqItem.quantity
  }

  const shipping = getShippingRate(req.shippingAddress.country)
  const total = subtotal + shipping

  return { items, subtotal, shipping, total }
}

/**
 * Atomically deduct stock for an order's items.
 * Returns true if all deductions succeeded, false otherwise (partial
 * failures are rolled back by caller — but Mongo doesn't have ACID across
 * docs without transactions, so prefer single-product orders in V1).
 */
export async function deductStock(
  items: { productId: string; sku: string; quantity: number }[],
): Promise<boolean> {
  for (const item of items) {
    const result = await ProductModel.findOneAndUpdate(
      {
        _id: item.productId,
        variants: {
          $elemMatch: { sku: item.sku, stock: { $gte: item.quantity } },
        },
      },
      { $inc: { 'variants.$.stock': -item.quantity } },
      { new: true },
    )
    if (!result) return false
  }
  return true
}

/**
 * Restore stock when refunding an order.
 */
export async function restoreStock(
  items: { productId: string; sku: string; quantity: number }[],
): Promise<void> {
  for (const item of items) {
    await ProductModel.findOneAndUpdate(
      { _id: item.productId, 'variants.sku': item.sku },
      { $inc: { 'variants.$.stock': item.quantity } },
    )
  }
}
