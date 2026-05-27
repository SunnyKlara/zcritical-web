import { Router } from 'express'
import { z } from 'zod'
import {
  ShipOrderRequestSchema,
  RefundOrderRequestSchema,
  ObjectIdSchema,
  ORDER_STATUSES,
} from '@critical/shared'
import { OrderModel } from '../models/Order.model'
import { PaymentEventModel } from '../models/PaymentEvent.model'
import { decryptLean, decryptLeanOne } from '../db/encrypted-fields.plugin'
import { validateBody, validateParams } from '../middleware/validate.middleware'
import { idempotency } from '../middleware/idempotency.middleware'
import { requireAdmin } from '../middleware/auth.middleware'
import { audit } from '../services/audit.service'
import { logger } from '../config/logger'
import { refundPayPalCapture } from '../services/paypal.service'
import { restoreStock } from '../services/order.service'
import { notifyOrderShipped, notifyOrderRefunded } from '../services/mailer.service'

export const adminOrderRouter = Router()

adminOrderRouter.use(requireAdmin)

const OrderIdParams = z.object({ id: ObjectIdSchema })

const ORDER_PII_FIELDS = [
  'email',
  'shippingAddress.fullName',
  'shippingAddress.line1',
  'shippingAddress.line2',
  'shippingAddress.phone',
]

/** List orders. */
adminOrderRouter.get('/', async (req, res, next) => {
  try {
    const { status, limit = '50' } = req.query as { status?: string; limit?: string }
    const filter: Record<string, unknown> = {}
    if (
      status &&
      typeof status === 'string' &&
      ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])
    ) {
      filter.status = status
    }
    const items = await OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(200, Number(limit) || 50))
      .lean()
    decryptLean(ORDER_PII_FIELDS, items)
    res.json(items)
  } catch (err) {
    next(err)
  }
})

/** Get one order with payment event timeline. */
adminOrderRouter.get('/:id', validateParams(OrderIdParams), async (req, res, next) => {
  try {
    const order = decryptLeanOne(ORDER_PII_FIELDS, await OrderModel.findById(req.params.id).lean())
    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }
    const events = await PaymentEventModel.find({ orderId: order._id })
      .sort({ createdAt: 1 })
      .lean()
    res.json({ order, events })
  } catch (err) {
    next(err)
  }
})

/** Mark order as shipped. */
adminOrderRouter.post(
  '/:id/ship',
  validateParams(OrderIdParams),
  idempotency({ scope: 'order.ship' }),
  validateBody(ShipOrderRequestSchema),
  async (req, res, next) => {
    try {
      const order = await OrderModel.findById(req.params.id)
      if (!order) {
        res.status(404).json({ error: 'Order not found' })
        return
      }
      if (order.status !== 'paid') {
        res.status(400).json({
          error: `Cannot ship order in status ${order.status}`,
        })
        return
      }

      order.status = 'shipped'
      order.fulfillment = {
        carrier: req.body.carrier,
        trackingNo: req.body.trackingNo,
        trackingUrl: req.body.trackingUrl,
        shippedAt: new Date(),
      }
      await order.save()

      audit({
        action: 'order.ship',
        actor: { type: 'admin', id: req.admin!.sub, username: req.admin!.username },
        target: order.orderNo,
        meta: { carrier: req.body.carrier, trackingNo: req.body.trackingNo },
        req,
      })

      notifyOrderShipped(order).catch((err: unknown) =>
        logger.error({ err, orderNo: order.orderNo }, 'Shipping email failed'),
      )

      logger.info({ orderNo: order.orderNo }, 'Order marked as shipped')

      res.json(order)
    } catch (err) {
      next(err)
    }
  },
)

/** Refund an order (full or partial). */
adminOrderRouter.post(
  '/:id/refund',
  validateParams(OrderIdParams),
  idempotency({ scope: 'order.refund' }),
  validateBody(RefundOrderRequestSchema),
  async (req, res, next) => {
    try {
      const order = await OrderModel.findById(req.params.id)
      if (!order) {
        res.status(404).json({ error: 'Order not found' })
        return
      }
      if (!order.payment.paypalCaptureId) {
        res.status(400).json({ error: 'Order has no captured payment to refund' })
        return
      }
      if (order.status === 'refunded') {
        res.status(400).json({ error: 'Order already refunded' })
        return
      }
      if (req.body.amount > order.total) {
        res.status(400).json({ error: 'Refund amount exceeds order total' })
        return
      }

      const { refundId, raw } = await refundPayPalCapture(
        order.payment.paypalCaptureId,
        req.body.amount,
        req.body.reason,
      )

      // Restore stock if refund covers all items
      if (req.body.amount === order.total) {
        await restoreStock(
          order.items.map((i) => ({
            productId: String(i.productId),
            sku: i.sku,
            quantity: i.quantity,
          })),
        )
      }

      order.status = 'refunded'
      if (req.body.reason) {
        order.notes = `${order.notes ?? ''}\n[REFUND] ${req.body.reason}`.trim()
      }
      await order.save()

      await PaymentEventModel.create({
        orderId: order._id,
        orderNo: order.orderNo,
        event: 'refunded',
        provider: 'paypal',
        providerId: refundId,
        amount: req.body.amount,
        raw,
        ip: req.ip,
      })

      audit({
        action: 'order.refund',
        actor: { type: 'admin', id: req.admin!.sub, username: req.admin!.username },
        target: order.orderNo,
        meta: { amount: req.body.amount, reason: req.body.reason },
        req,
      })

      notifyOrderRefunded(order, req.body.amount).catch((err: unknown) =>
        logger.error({ err, orderNo: order.orderNo }, 'Refund email failed'),
      )

      res.json(order)
    } catch (err) {
      next(err)
    }
  },
)
