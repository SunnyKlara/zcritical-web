/**
 * Business-anomaly detector. Runs every 5 minutes and reports any KPI that
 * crosses its threshold to Sentry + the audit log.
 *
 * Thresholds are intentionally loose for the v1 launch (we want false
 * positives to be rare); tighten as traffic baseline forms.
 *
 * Indicators:
 *   1. Failed admin logins / 1h > 100  → credential stuffing
 *   2. Leads from a single IP / 1h > 50 → scraper / spam
 *   3. Orders created → captured ratio < 30% in last 1h → cart abuse
 *   4. Refund ratio (refunded / paid) > 5% in last 24h → fraud / quality
 *
 * Each tick the service captures a Sentry message with `tags: { kpi }` and
 * writes an `audit({ action: 'anomaly.<kpi>' })` row. We never block traffic
 * automatically — this is a tripwire, not an enforcer.
 */
import { AuditLogModel } from '../models/AuditLog.model'
import { LeadModel } from '../models/Lead.model'
import { OrderModel } from '../models/Order.model'
import { audit } from './audit.service'
import { performScheduledDeletions } from './gdpr.service'
import { logger } from '../config/logger'
import { Sentry } from '../lib/sentry'

const TICK_MS = 5 * 60 * 1000

let handle: NodeJS.Timeout | null = null

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

interface Threshold {
  kpi: string
  fn: () => Promise<{ value: number; meta?: Record<string, unknown> } | null>
  limit: number
  // 'above' fires when value >= limit; 'below' fires when value <= limit.
  direction: 'above' | 'below'
}

const checks: Threshold[] = [
  {
    kpi: 'failed-logins-1h',
    direction: 'above',
    limit: 100,
    fn: async () => {
      const since = new Date(Date.now() - HOUR)
      const value = await AuditLogModel.countDocuments({
        action: { $in: ['auth.login', 'auth.login.lock', 'auth.login.locked', 'auth.2fa.fail'] },
        success: false,
        createdAt: { $gte: since },
      })
      return { value }
    },
  },
  {
    kpi: 'leads-single-ip-1h',
    direction: 'above',
    limit: 50,
    fn: async () => {
      const since = new Date(Date.now() - HOUR)
      const top = await LeadModel.aggregate<{ _id: string | null; count: number }>([
        { $match: { createdAt: { $gte: since }, ip: { $ne: null } } },
        { $group: { _id: '$ip', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ])
      const top1 = top[0]
      if (!top1) return { value: 0 }
      return { value: top1.count, meta: { ip: top1._id } }
    },
  },
  {
    kpi: 'capture-success-ratio-1h',
    direction: 'below',
    limit: 0.3,
    fn: async () => {
      const since = new Date(Date.now() - HOUR)
      const created = await OrderModel.countDocuments({ createdAt: { $gte: since } })
      if (created < 10) return null // not enough volume to compare
      const paid = await OrderModel.countDocuments({
        createdAt: { $gte: since },
        status: { $in: ['paid', 'shipped', 'delivered', 'refunded'] },
      })
      const ratio = paid / created
      return { value: Number(ratio.toFixed(3)), meta: { created, paid } }
    },
  },
  {
    kpi: 'refund-ratio-24h',
    direction: 'above',
    limit: 0.05,
    fn: async () => {
      const since = new Date(Date.now() - DAY)
      const paid = await OrderModel.countDocuments({
        createdAt: { $gte: since },
        status: { $in: ['paid', 'shipped', 'delivered', 'refunded'] },
      })
      if (paid < 20) return null
      const refunded = await OrderModel.countDocuments({
        createdAt: { $gte: since },
        status: 'refunded',
      })
      const ratio = refunded / paid
      return { value: Number(ratio.toFixed(3)), meta: { paid, refunded } }
    },
  },
]

function fires(direction: Threshold['direction'], value: number, limit: number): boolean {
  return direction === 'above' ? value >= limit : value <= limit
}

export async function runAnomalyTick(): Promise<void> {
  for (const check of checks) {
    try {
      const result = await check.fn()
      if (!result) continue
      if (!fires(check.direction, result.value, check.limit)) continue

      const message = `anomaly: ${check.kpi}=${result.value} (limit ${check.direction} ${check.limit})`
      logger.warn({ kpi: check.kpi, value: result.value, ...result.meta }, message)
      audit({
        action: `anomaly.${check.kpi}`,
        actor: { type: 'system' },
        meta: { value: result.value, limit: check.limit, ...result.meta },
      })
      Sentry.captureMessage(message, {
        level: 'warning',
        tags: { kpi: check.kpi },
        extra: { value: result.value, limit: check.limit, ...result.meta },
      })
    } catch (err) {
      logger.error({ err, kpi: check.kpi }, 'Anomaly check failed')
    }
  }
}

export function startAnomalyDetector(): void {
  if (handle) return
  // Don't run on boot — wait one tick so the system is warm.
  handle = setInterval(() => {
    void runAnomalyTick()
    void performScheduledDeletions().catch((err: unknown) =>
      logger.error({ err }, 'GDPR hard-delete tick failed'),
    )
  }, TICK_MS)
  handle.unref()
  logger.info({ intervalMs: TICK_MS }, 'Anomaly detector started')
}

export function stopAnomalyDetector(): void {
  if (handle) {
    clearInterval(handle)
    handle = null
    logger.info('Anomaly detector stopped')
  }
}
