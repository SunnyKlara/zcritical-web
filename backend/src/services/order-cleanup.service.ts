import { OrderModel } from '../models/Order.model'
import { env } from '../config/env'
import { logger } from '../config/logger'

/**
 * Order cleanup service — periodically marks abandoned pending orders as
 * cancelled. No stock to release because we deduct only AFTER capture.
 *
 * Single-instance V1: simple setInterval. Move to BullMQ + Redis when
 * scaling beyond one Render web service.
 */

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // every 5 minutes

let intervalHandle: NodeJS.Timeout | null = null

export async function cleanupExpiredOrders(): Promise<number> {
  const expiry = new Date(Date.now() - env.ORDER_EXPIRY_MINUTES * 60 * 1000)

  const result = await OrderModel.updateMany(
    { status: 'pending_payment', createdAt: { $lt: expiry } },
    { $set: { status: 'cancelled' } },
  )

  if (result.modifiedCount > 0) {
    logger.info({ count: result.modifiedCount }, 'Cleaned up expired pending orders')
  }
  return result.modifiedCount
}

export function startOrderCleanup(): void {
  if (intervalHandle) return
  // Run once on boot then on interval
  void cleanupExpiredOrders().catch((err) => logger.error({ err }, 'Initial order cleanup failed'))
  intervalHandle = setInterval(() => {
    void cleanupExpiredOrders().catch((err) => logger.error({ err }, 'Order cleanup tick failed'))
  }, CLEANUP_INTERVAL_MS)
  intervalHandle.unref()
  logger.info({ intervalMs: CLEANUP_INTERVAL_MS }, 'Order cleanup service started')
}

export function stopOrderCleanup(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
    logger.info('Order cleanup service stopped')
  }
}
