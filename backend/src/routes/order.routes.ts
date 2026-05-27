import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  CreateOrderRequestSchema,
  CapturePaymentRequestSchema,
  OrderLookupSchema,
  type CreateOrderResponse,
} from '@critical/shared'
import { OrderModel } from '../models/Order.model'
import { PaymentEventModel } from '../models/PaymentEvent.model'
import { validateBody } from '../middleware/validate.middleware'
import { idempotency } from '../middleware/idempotency.middleware'
import { audit } from '../services/audit.service'
import { logger } from '../config/logger'
import { env, isTest } from '../config/env'
import { emailBlindIndex } from '../lib/crypto'
import { generateOrderNo } from '../lib/order-no'
import { priceOrderRequest, deductStock } from '../services/order.service'
import { createPayPalOrder, capturePayPalOrder } from '../services/paypal.service'
import { notifyOrderConfirmed } from '../services/mailer.service'

export const orderRouter = Router()

const orderCreateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
})

const orderLookupLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
})

/** Public: create order + initiate PayPal flow. */
orderRouter.post(
  '/',
  orderCreateLimiter,
  idempotency({ scope: 'order.create' }),
  validateBody(CreateOrderRequestSchema),
  async (req, res, next) => {
    try {
      // 1. Validate inventory + price the order
      const priced = await priceOrderRequest(req.body)

      // 2. Generate order number
      const orderNo = generateOrderNo()

      // 3. Build description for PayPal display
      const description = priced.items
        .slice(0, 3)
        .map((i) => `${i.name} × ${i.quantity}`)
        .join(', ')
        .substring(0, 127)

      // 4. Create PayPal order
      const { paypalOrderId, approveUrl } = await createPayPalOrder({
        orderNo,
        description,
        items: priced.items.map((i) => ({
          name: i.name.substring(0, 127),
          sku: i.sku,
          unitAmount: i.price,
          quantity: i.quantity,
        })),
        subtotal: priced.subtotal,
        shipping: priced.shipping,
        total: priced.total,
        shippingAddress: req.body.shippingAddress,
        returnUrl: `${env.FRONTEND_URL}/${req.body.locale}/checkout/success`,
        cancelUrl: `${env.FRONTEND_URL}/${req.body.locale}/checkout/cancel`,
      })

      // 5. Persist order in pending_payment state
      const order = await OrderModel.create({
        orderNo,
        email: req.body.email,
        status: 'pending_payment',
        items: priced.items,
        subtotal: priced.subtotal,
        shipping: priced.shipping,
        total: priced.total,
        currency: 'USD',
        shippingAddress: req.body.shippingAddress,
        payment: {
          method: 'paypal',
          paypalOrderId,
        },
        locale: req.body.locale,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      // 6. Log payment event
      await PaymentEventModel.create({
        orderId: order._id,
        orderNo,
        event: 'created',
        provider: 'paypal',
        providerId: paypalOrderId,
        amount: priced.total,
        ip: req.ip,
      })

      audit({
        action: 'order.create',
        actor: { type: 'visitor' },
        target: orderNo,
        req,
      })

      const response: CreateOrderResponse = {
        orderNo,
        total: priced.total,
        currency: 'USD',
        approveUrl,
      }
      res.status(201).json(response)
    } catch (err) {
      next(err)
    }
  },
)

/** Public: PayPal capture endpoint, called by frontend success page. */
orderRouter.post(
  '/payments/paypal/capture',
  idempotency({ scope: 'order.capture' }),
  validateBody(CapturePaymentRequestSchema),
  async (req, res, next) => {
    try {
      const { paypalOrderId } = req.body

      // 1. Find order by paypalOrderId
      const order = await OrderModel.findOne({
        'payment.paypalOrderId': paypalOrderId,
      })
      if (!order) {
        res.status(404).json({ error: 'Order not found' })
        return
      }

      // 2. Idempotency — already paid? return success without re-capturing
      if (order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered') {
        res.json({ orderNo: order.orderNo, status: order.status })
        return
      }

      if (order.status !== 'pending_payment') {
        res.status(400).json({ error: `Cannot capture order in status ${order.status}` })
        return
      }

      // 3. Capture via PayPal
      const { captureId, amount, raw } = await capturePayPalOrder(paypalOrderId)

      // 4. Verify amount matches what we charged (anti-tampering)
      if (amount !== order.total) {
        logger.error(
          { orderNo: order.orderNo, expected: order.total, captured: amount },
          'PayPal capture amount mismatch',
        )
        await PaymentEventModel.create({
          orderId: order._id,
          orderNo: order.orderNo,
          event: 'error',
          provider: 'paypal',
          providerId: captureId,
          amount,
          raw,
          ip: req.ip,
        })
        res.status(400).json({ error: 'Payment amount mismatch' })
        return
      }

      // 5. Atomically deduct stock
      const stockOk = await deductStock(
        order.items.map((i) => ({
          productId: String(i.productId),
          sku: i.sku,
          quantity: i.quantity,
        })),
      )
      if (!stockOk) {
        // Race condition: another order beat us. Refund must be done manually.
        logger.error(
          { orderNo: order.orderNo },
          'Stock deduction failed after capture — manual refund required',
        )
        order.notes = '[AUTO] Stock deduction failed after capture'
        await order.save()
      }

      // 6. Mark order paid
      order.status = 'paid'
      order.payment.paypalCaptureId = captureId
      order.payment.paidAt = new Date()
      await order.save()

      // 7. Log payment event
      await PaymentEventModel.create({
        orderId: order._id,
        orderNo: order.orderNo,
        event: 'captured',
        provider: 'paypal',
        providerId: captureId,
        amount,
        raw,
        ip: req.ip,
      })

      audit({
        action: 'order.paid',
        actor: { type: 'visitor' },
        target: order.orderNo,
        req,
      })

      // Fire-and-forget order confirmation email
      notifyOrderConfirmed(order).catch((err: unknown) =>
        logger.error({ err, orderNo: order.orderNo }, 'Order confirmation email failed'),
      )

      res.json({ orderNo: order.orderNo, status: order.status })
    } catch (err) {
      next(err)
    }
  },
)

/** Public: order lookup (email + orderNo). Returns sanitized data. */
orderRouter.get('/lookup', orderLookupLimiter, async (req, res, next) => {
  try {
    const parsed = OrderLookupSchema.safeParse({
      email: req.query.email,
      orderNo: req.query.orderNo,
    })
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid lookup parameters' })
      return
    }

    // Email is encrypted at rest — query against the deterministic blind index.
    const order = await OrderModel.findOne({
      orderNo: parsed.data.orderNo,
      emailHash: emailBlindIndex('order.email', parsed.data.email),
    })

    if (!order) {
      // Don't reveal which field was wrong
      res.status(404).json({ error: 'Order not found' })
      return
    }

    // Sanitize: remove IP, full address details (keep city/country)
    res.json({
      orderNo: order.orderNo,
      status: order.status,
      total: order.total,
      currency: order.currency,
      items: order.items,
      shippingCity: order.shippingAddress.city,
      shippingCountry: order.shippingAddress.country,
      fulfillment: order.fulfillment,
      createdAt: order.createdAt,
      paidAt: order.payment?.paidAt,
    })
  } catch (err) {
    next(err)
  }
})
