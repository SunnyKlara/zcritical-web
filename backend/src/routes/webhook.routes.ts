import { Router } from 'express'
import { OrderModel } from '../models/Order.model'
import { PaymentEventModel } from '../models/PaymentEvent.model'
import { WebhookEventModel } from '../models/WebhookEvent.model'
import { logger } from '../config/logger'
import { verifyWebhookSignature } from '../services/paypal.service'
import { audit } from '../services/audit.service'

export const webhookRouter = Router()

/** Maximum age (ms) tolerated for a PayPal `paypal-transmission-time` header. */
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000

/** Retention for processed-webhook records (auto-purged via TTL). */
const WEBHOOK_DEDUPE_TTL_MS = 30 * 24 * 60 * 60 * 1000

function getHeader(headers: Record<string, string | string[] | undefined>, key: string): string {
  const v = headers[key.toLowerCase()]
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

/**
 * PayPal Webhook receiver.
 *
 * Defenses:
 * 1. Signature verification via `verifyWebhookSignature`.
 * 2. Timestamp window — reject events older / further-future than 5 minutes
 *    (`paypal-transmission-time`) to defeat replays of legitimately captured
 *    payloads.
 * 3. Transmission-id deduplication — `WebhookEventModel` records each
 *    successfully processed delivery; duplicates short-circuit with 200.
 * 4. Idempotency on the business side — order state transitions check
 *    current status before mutating.
 *
 * Note: relies on `rawBody` being captured by the json middleware in
 * server.ts for signature verification.
 */
webhookRouter.post('/paypal/webhook', async (req, res) => {
  // Acknowledge receipt early so PayPal doesn't retry on slow processing.
  // 200 is also returned for replays / out-of-window events to suppress retries.
  res.status(200).json({ received: true })

  try {
    const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody?.toString() ?? ''
    if (!rawBody) {
      logger.warn('PayPal webhook received without raw body')
      return
    }

    // ── 1. Signature verification ────────────────────────────────────────
    const isValid = await verifyWebhookSignature(req.headers, rawBody)
    if (!isValid) {
      logger.warn({ headers: req.headers }, 'Invalid PayPal webhook signature')
      return
    }

    // ── 2. Timestamp window ──────────────────────────────────────────────
    const transmissionTime = getHeader(req.headers, 'paypal-transmission-time')
    if (transmissionTime) {
      const parsed = Date.parse(transmissionTime)
      if (Number.isNaN(parsed)) {
        logger.warn({ transmissionTime }, 'PayPal webhook has unparseable transmission-time')
        return
      }
      const skew = Math.abs(Date.now() - parsed)
      if (skew > MAX_WEBHOOK_AGE_MS) {
        logger.warn(
          { transmissionTime, skewMs: skew },
          'PayPal webhook outside acceptable time window — possible replay',
        )
        return
      }
    }

    // ── 3. Transmission-id deduplication ─────────────────────────────────
    const transmissionId = getHeader(req.headers, 'paypal-transmission-id')
    if (!transmissionId) {
      logger.warn('PayPal webhook missing paypal-transmission-id header')
      return
    }

    const event = req.body as {
      event_type: string
      resource: {
        id?: string
        custom_id?: string
        supplementary_data?: { related_ids?: { order_id?: string } }
      }
    }

    try {
      await WebhookEventModel.create({
        provider: 'paypal',
        transmissionId,
        eventType: event.event_type,
        receivedAt: new Date(),
        expiresAt: new Date(Date.now() + WEBHOOK_DEDUPE_TTL_MS),
      })
    } catch (err: unknown) {
      // Duplicate key → already processed. Treat as success.
      if ((err as { code?: number }).code === 11000) {
        logger.info(
          { transmissionId, eventType: event.event_type },
          'PayPal webhook replay ignored',
        )
        return
      }
      throw err
    }

    logger.info({ eventType: event.event_type, transmissionId }, 'PayPal webhook received')

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.REFUNDED': {
        const captureId = event.resource.supplementary_data?.related_ids?.order_id
        if (!captureId) return
        const order = await OrderModel.findOne({ 'payment.paypalCaptureId': captureId })
        if (order && order.status !== 'refunded') {
          order.status = 'refunded'
          await order.save()
          await PaymentEventModel.create({
            orderId: order._id,
            orderNo: order.orderNo,
            event: 'refunded',
            provider: 'paypal',
            providerId: event.resource.id ?? captureId,
            amount: order.total,
            raw: event,
          })
          audit({
            action: 'order.refund.webhook',
            actor: { type: 'system' },
            target: order.orderNo,
          })
        }
        break
      }

      case 'CUSTOMER.DISPUTE.CREATED': {
        const orderNo = event.resource.custom_id
        if (!orderNo) return
        const order = await OrderModel.findOne({ orderNo })
        if (order) {
          await PaymentEventModel.create({
            orderId: order._id,
            orderNo,
            event: 'disputed',
            provider: 'paypal',
            providerId: event.resource.id ?? '',
            amount: 0,
            raw: event,
          })
          logger.warn({ orderNo }, 'PayPal dispute created')
        }
        break
      }

      default:
        // Unknown / unhandled event types are logged but not acted on.
        break
    }
  } catch (err) {
    logger.error({ err }, 'PayPal webhook processing failed')
  }
})
