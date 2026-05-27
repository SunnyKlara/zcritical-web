/**
 * GDPR / CCPA data-subject rights workflow.
 *
 * Two flows, both proven via email OTP:
 *   - **export**: returns a JSON dump of every record we hold whose
 *     `emailHash` matches the requester. Delivered as a one-time signed
 *     download URL (the route serves the dump only once per token).
 *   - **delete**: marks every matching record with `scheduledDeleteAt =
 *     now + 30d`. The user may cancel within the window. After it elapses
 *     the cron worker hard-deletes the rows.
 */
import { createHash, randomInt } from 'node:crypto'
import { decryptString, emailBlindIndex } from '../lib/crypto'
import { decryptLean } from '../db/encrypted-fields.plugin'
import { LeadModel } from '../models/Lead.model'
import { OrderModel } from '../models/Order.model'
import { DeviceModel } from '../models/Device.model'
import { logger } from '../config/logger'

/** OTP lifetime — short enough to be meaningful but room for clock drift / typing. */
export const OTP_TTL_MS = 15 * 60 * 1000
/** How many wrong OTPs we tolerate before locking the request. */
export const OTP_MAX_ATTEMPTS = 5
/** Soft-delete grace period before hard delete. */
export const DELETION_GRACE_MS = 30 * 24 * 60 * 60 * 1000

export function generateOtp(): string {
  // 6 digits, zero-padded.
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp.trim()).digest('hex')
}

export type DataRequestKind = 'export' | 'delete'

/**
 * Collect every record across Lead / Order / Device that hashes to the
 * supplied email and returns plaintext (decrypted) copies suitable for the
 * user-facing export bundle.
 */
export async function collectUserData(email: string): Promise<{
  email: string
  exportedAt: string
  leads: unknown[]
  orders: unknown[]
  devices: unknown[]
}> {
  const leadRaw = await LeadModel.find({
    emailHash: emailBlindIndex('lead.email', email),
  })
    .select('-emailHash -__v')
    .lean()
  const leads = decryptLean(['name', 'email', 'phone', 'message'], leadRaw as never)

  const orderRaw = await OrderModel.find({
    emailHash: emailBlindIndex('order.email', email),
  })
    .select('-emailHash -__v')
    .lean()
  const orders = decryptLean(
    [
      'email',
      'shippingAddress.fullName',
      'shippingAddress.line1',
      'shippingAddress.line2',
      'shippingAddress.phone',
    ],
    orderRaw as never,
  )

  const deviceRaw = await DeviceModel.find({
    emailHash: emailBlindIndex('device.email', email),
  })
    .select('-emailHash -__v')
    .lean()
  const devices = decryptLean(['email'], deviceRaw as never)

  return {
    email,
    exportedAt: new Date().toISOString(),
    leads,
    orders,
    devices,
  }
}

/**
 * Schedule soft-delete on every record matching the email. The records still
 * exist (so admin can spot abuse / partial recovery) but `scheduledDeleteAt`
 * marks them for the cron worker.
 */
export async function scheduleSoftDelete(
  email: string,
): Promise<{ scheduledAt: Date; affected: number }> {
  const scheduledAt = new Date(Date.now() + DELETION_GRACE_MS)
  let affected = 0

  const leadRes = await LeadModel.updateMany(
    { emailHash: emailBlindIndex('lead.email', email) },
    { $set: { scheduledDeleteAt: scheduledAt } },
  )
  affected += leadRes.modifiedCount

  const orderRes = await OrderModel.updateMany(
    { emailHash: emailBlindIndex('order.email', email) },
    { $set: { scheduledDeleteAt: scheduledAt } },
  )
  affected += orderRes.modifiedCount

  const deviceRes = await DeviceModel.updateMany(
    { emailHash: emailBlindIndex('device.email', email) },
    { $set: { scheduledDeleteAt: scheduledAt } },
  )
  affected += deviceRes.modifiedCount

  return { scheduledAt, affected }
}

export async function cancelSoftDelete(email: string): Promise<{ affected: number }> {
  let affected = 0
  const leadRes = await LeadModel.updateMany(
    {
      emailHash: emailBlindIndex('lead.email', email),
      scheduledDeleteAt: { $exists: true },
    },
    { $unset: { scheduledDeleteAt: '' } },
  )
  affected += leadRes.modifiedCount
  const orderRes = await OrderModel.updateMany(
    {
      emailHash: emailBlindIndex('order.email', email),
      scheduledDeleteAt: { $exists: true },
    },
    { $unset: { scheduledDeleteAt: '' } },
  )
  affected += orderRes.modifiedCount
  const deviceRes = await DeviceModel.updateMany(
    {
      emailHash: emailBlindIndex('device.email', email),
      scheduledDeleteAt: { $exists: true },
    },
    { $unset: { scheduledDeleteAt: '' } },
  )
  affected += deviceRes.modifiedCount
  return { affected }
}

/**
 * Hard-delete records whose grace period has elapsed. Run by the cron tick.
 */
export async function performScheduledDeletions(): Promise<number> {
  const now = new Date()
  let deleted = 0
  const r1 = await LeadModel.deleteMany({ scheduledDeleteAt: { $lte: now } })
  const r2 = await OrderModel.deleteMany({ scheduledDeleteAt: { $lte: now } })
  const r3 = await DeviceModel.deleteMany({ scheduledDeleteAt: { $lte: now } })
  deleted = r1.deletedCount + r2.deletedCount + r3.deletedCount
  if (deleted > 0) {
    logger.info({ deleted }, 'GDPR scheduled hard-deletions performed')
  }
  return deleted
}

/** Decrypt the email field on a DataRequest row. */
export function decryptDataRequestEmail(ciphertext: string): string {
  return decryptString(ciphertext)
}
