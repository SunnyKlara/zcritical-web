/**
 * Login-device tracking and "new device" alerting.
 *
 * On every successful authentication we compute a fuzzy fingerprint of
 * (userAgent + IP prefix) and look it up in `LoginDeviceModel`. If unseen,
 * we record it and dispatch a "new sign-in" email to the user. Repeat logins
 * just bump `lastSeenAt` and `loginCount`.
 *
 * Why a fuzzy fingerprint rather than a real device cookie?
 *   - We're protecting against credential theft (the attacker won't have the
 *     same browser+OS combination on the same ASN).
 *   - A persistent cookie can be wiped by the legitimate user clearing
 *     storage; the resulting "new sign-in" alert would be noise.
 *   - Both signals can co-exist later (cookie + fuzzy hash); for now the
 *     fuzzy hash is enough to catch the obvious case.
 */
import { createHash } from 'node:crypto'
import { LoginDeviceModel } from '../models/LoginDevice.model'
import { notifyNewSignIn } from './mailer.service'
import { audit } from './audit.service'
import { logger } from '../config/logger'

/** Reduce an IP to a /24 (IPv4) or /48 (IPv6) prefix to absorb DHCP / VPN drift. */
export function ipPrefix(ip: string | undefined): string {
  if (!ip) return ''
  // Handle IPv4-mapped IPv6 (::ffff:127.0.0.1).
  const v4Match = /(\d+\.\d+\.\d+)\.\d+/.exec(ip)
  if (v4Match) return v4Match[1]!
  // Plain IPv6: keep first three groups (~ /48).
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 3).join(':')
  }
  return ip
}

export function computeFingerprint(userAgent: string | undefined, ip: string | undefined): string {
  return createHash('sha256')
    .update(`${userAgent ?? ''}|${ipPrefix(ip)}`)
    .digest('hex')
}

export interface LoginContext {
  userId: string
  username: string
  email: string
  ip?: string
  userAgent?: string
}

/**
 * Record a successful login and email the user if the device is new.
 *
 * Designed to never throw — auth flows must continue even when this side
 * effect fails. All errors are logged at warn level.
 */
export async function recordLoginAndNotify(ctx: LoginContext): Promise<void> {
  try {
    const fingerprintHash = computeFingerprint(ctx.userAgent, ctx.ip)
    const prefix = ipPrefix(ctx.ip)
    const now = new Date()

    const result = await LoginDeviceModel.findOneAndUpdate(
      { userId: ctx.userId, fingerprintHash },
      {
        $set: { lastSeenAt: now, ipPrefix: prefix, userAgent: ctx.userAgent ?? null },
        $setOnInsert: {
          userId: ctx.userId,
          fingerprintHash,
          firstSeenAt: now,
        },
        $inc: { loginCount: 1 },
      },
      { upsert: true, new: false, includeResultMetadata: true },
    )

    // result.value is null when this was an upsert (no prior doc found).
    const isNew = !result?.value
    if (isNew) {
      audit({
        action: 'auth.new_device',
        actor: { type: 'admin', id: ctx.userId, username: ctx.username },
        meta: { ipPrefix: prefix, fingerprintHash },
      })
      // Fire-and-forget email.
      notifyNewSignIn({
        email: ctx.email,
        username: ctx.username,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        signedInAt: now,
      }).catch((err: unknown) => logger.warn({ err }, 'New sign-in email failed'))
    }
  } catch (err) {
    logger.warn({ err, userId: ctx.userId }, 'recordLoginAndNotify failed')
  }
}
