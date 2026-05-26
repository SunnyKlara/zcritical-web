import { Router } from 'express'
import { OrderModel } from '../models/Order.model'
import { PaymentEventModel } from '../models/PaymentEvent.model'
import { logger } from '../config/logger'
import { verifyWebhookSignature } from '../services/paypal.service'
import { audit } from '../services/audit.service'

export const webhookRouter = Router()

/**
 * PayPal Webhook receiver.
 *
 * Handles asynchronous events:
 * - PAYMENT.CAPTURE.REFUNDED → mark order refunded
 * - CUSTOMER.DISPUTE.CREATED → log dispute event
 *
 * Always returns 200 quickly (PayPal retries on non-2xx). Process work
 * asynchronously where possible.
 *
 * Note: relies on `rawBody` being captured by the json middleware in
 * server.ts for signature verification.
 */
webhookRouter.post('/paypal/webhook', async (req, res) => {
  // Acknowledge receipt early so PayPal doesn't retry on slow processing
  res.status(200).json({ received: true })

  try {
    const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody?.toString() ?? ''
    if (!rawBody) {
      logger.warn('PayPal webhook received without raw body')
      return
    }

    const isValid = await verifyWebhookSignature(req.headers, rawBody)
    if (!isValid) {
      logger.warn({ headers: req.headers }, 'Invalid PayPal webhook signature')
      return
    }

    const event = req.body as {
      event_type: string
      resource: { id?: string; custom_id?: string; supplementary_data?: { related_ids?: { order_id?: string } } }
    }

    logger.info({ eventType: event.event_type }, 'PayPal webhook received')

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.REFUNDED': {
        // The capture ID that was refunded
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
        // Find related order by capture/order id (custom_id contains orderNo)
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
        // Unknown / unhandled event types are still logged for visibility
        break
    }
  } catch (err) {
    logger.error({ err }, 'PayPal webhook processing failed')
  }
})
