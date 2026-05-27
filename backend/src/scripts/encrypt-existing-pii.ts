/**
 * One-shot migration: encrypt PII fields on rows written before the
 * `encryptedFieldsPlugin` was installed.
 *
 * Idempotent: rows whose target fields already match the `v1:...` ciphertext
 * format are skipped. Safe to re-run.
 *
 * Usage:
 *   pnpm --filter backend exec tsx src/scripts/encrypt-existing-pii.ts
 *
 * Recommended:
 *   1. Snapshot the database first (Atlas → "Take Snapshot Now").
 *   2. Verify ENCRYPTION_KEY is set in your environment.
 *   3. Run on a maintenance window — the script holds no locks but writes
 *      to every PII row in Lead / Order / Device.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { env } from '../config/env'
import { encryptString, emailBlindIndex, looksEncrypted } from '../lib/crypto'
import { logger } from '../config/logger'

interface MigrationStats {
  scanned: number
  rewritten: number
}

async function migrateLeads(): Promise<MigrationStats> {
  const stats: MigrationStats = { scanned: 0, rewritten: 0 }
  const collection = mongoose.connection.collection('leads')
  const cursor = collection.find({})
  for await (const doc of cursor) {
    stats.scanned += 1
    const update: Record<string, unknown> = {}
    for (const field of ['name', 'email', 'phone', 'message'] as const) {
      const v = doc[field]
      if (typeof v === 'string' && v.length > 0 && !looksEncrypted(v)) {
        update[field] = encryptString(v)
      }
    }
    // Always (re)compute emailHash if email was plaintext or hash missing.
    if (typeof doc.email === 'string' && !looksEncrypted(doc.email)) {
      update.emailHash = emailBlindIndex('lead.email', doc.email)
    } else if (!doc.emailHash && typeof doc.email === 'string' && looksEncrypted(doc.email)) {
      // Encrypted-but-no-hash row → cannot derive plaintext to recompute hash.
      // Leave alone; will be repaired on next write to that row.
    }
    if (Object.keys(update).length > 0) {
      await collection.updateOne({ _id: doc._id }, { $set: update })
      stats.rewritten += 1
    }
  }
  return stats
}

async function migrateOrders(): Promise<MigrationStats> {
  const stats: MigrationStats = { scanned: 0, rewritten: 0 }
  const collection = mongoose.connection.collection('orders')
  const cursor = collection.find({})
  for await (const doc of cursor) {
    stats.scanned += 1
    const update: Record<string, unknown> = {}
    if (typeof doc.email === 'string' && doc.email && !looksEncrypted(doc.email)) {
      update.email = encryptString(doc.email)
      update.emailHash = emailBlindIndex('order.email', doc.email)
    }
    const addr = (doc.shippingAddress ?? {}) as Record<string, unknown>
    for (const f of ['fullName', 'line1', 'line2', 'phone'] as const) {
      const v = addr[f]
      if (typeof v === 'string' && v && !looksEncrypted(v)) {
        update[`shippingAddress.${f}`] = encryptString(v)
      }
    }
    if (Object.keys(update).length > 0) {
      await collection.updateOne({ _id: doc._id }, { $set: update })
      stats.rewritten += 1
    }
  }
  return stats
}

async function migrateDevices(): Promise<MigrationStats> {
  const stats: MigrationStats = { scanned: 0, rewritten: 0 }
  const collection = mongoose.connection.collection('devices')
  const cursor = collection.find({})
  for await (const doc of cursor) {
    stats.scanned += 1
    const update: Record<string, unknown> = {}
    if (typeof doc.email === 'string' && doc.email && !looksEncrypted(doc.email)) {
      update.email = encryptString(doc.email)
      update.emailHash = emailBlindIndex('device.email', doc.email)
    }
    if (Object.keys(update).length > 0) {
      await collection.updateOne({ _id: doc._id }, { $set: update })
      stats.rewritten += 1
    }
  }
  return stats
}

async function main(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI)
  logger.info('Connected — starting PII encryption migration')

  const lead = await migrateLeads()
  logger.info(lead, 'leads migrated')

  const order = await migrateOrders()
  logger.info(order, 'orders migrated')

  const device = await migrateDevices()
  logger.info(device, 'devices migrated')

  await mongoose.disconnect()
  logger.info('Migration complete')
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Migration failed')
  process.exit(1)
})
