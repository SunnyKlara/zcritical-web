import { Router } from 'express'
import { z } from 'zod'
import {
  CreateProductRequestSchema,
  UpdateProductRequestSchema,
  ObjectIdSchema,
} from '@critical/shared'
import { ProductModel } from '../models/Product.model'
import { validateBody, validateParams } from '../middleware/validate.middleware'
import { requireAdmin } from '../middleware/auth.middleware'
import { audit } from '../services/audit.service'

export const productRouter = Router()
export const adminProductRouter = Router()

// ─── Public endpoints ───────────────────────────────────────────────────────

productRouter.get('/', async (_req, res, next) => {
  try {
    const items = await ProductModel.find({ status: 'active' })
      .sort({ featured: -1, createdAt: -1 })
      .lean()
    res.json(items)
  } catch (err) {
    next(err)
  }
})

const SlugParams = z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) })

productRouter.get('/:slug', validateParams(SlugParams), async (req, res, next) => {
  try {
    const product = await ProductModel.findOne({
      slug: req.params.slug,
      status: 'active',
    }).lean()
    if (!product) {
      res.status(404).json({ error: 'Product not found' })
      return
    }
    res.json(product)
  } catch (err) {
    next(err)
  }
})

// ─── Admin endpoints ────────────────────────────────────────────────────────

const ProductIdParams = z.object({ id: ObjectIdSchema })

adminProductRouter.use(requireAdmin)

adminProductRouter.get('/', async (_req, res, next) => {
  try {
    const items = await ProductModel.find().sort({ createdAt: -1 }).lean()
    res.json(items)
  } catch (err) {
    next(err)
  }
})

adminProductRouter.post('/', validateBody(CreateProductRequestSchema), async (req, res, next) => {
  try {
    const product = await ProductModel.create(req.body)
    audit({
      action: 'product.create',
      actor: { type: 'admin', id: req.admin!.sub, username: req.admin!.username },
      target: String(product._id),
      req,
    })
    res.status(201).json(product)
  } catch (err) {
    next(err)
  }
})

adminProductRouter.patch(
  '/:id',
  validateParams(ProductIdParams),
  validateBody(UpdateProductRequestSchema),
  async (req, res, next) => {
    try {
      const updated = await ProductModel.findByIdAndUpdate(
        req.params.id,
        req.body as Record<string, unknown>,
        { new: true },
      )
      if (!updated) {
        res.status(404).json({ error: 'Product not found' })
        return
      }
      audit({
        action: 'product.update',
        actor: { type: 'admin', id: req.admin!.sub, username: req.admin!.username },
        target: String(updated._id),
        req,
      })
      res.json(updated)
    } catch (err) {
      next(err)
    }
  },
)

adminProductRouter.delete('/:id', validateParams(ProductIdParams), async (req, res, next) => {
  try {
    // Soft-archive only — never hard-delete (orders reference products)
    const updated = await ProductModel.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true },
    )
    if (!updated) {
      res.status(404).json({ error: 'Product not found' })
      return
    }
    audit({
      action: 'product.archive',
      actor: { type: 'admin', id: req.admin!.sub, username: req.admin!.username },
      target: String(updated._id),
      req,
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
