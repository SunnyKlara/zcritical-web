import { createHash } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { IdempotencyKeyModel } from '../models/IdempotencyKey.model'
import { logger } from '../config/logger'

/**
 * Stripe-style idempotency middleware.
 *
 * Clients opt in by sending an `Idempotency-Key` header (1..255 chars) on
 * non-safe requests. The middleware:
 *
 *   1. On first call, lets the handler run and caches the JSON response.
 *   2. On replay with the SAME key + same body hash, returns the cached
 *      response without re-executing the handler.
 *   3. On replay with the SAME key but a DIFFERENT body, returns 422 to
 *      prevent ambiguous double-write semantics.
 *
 * Records expire after `ttlMs` (default 24h) via a TTL index on the model.
 *
 * Use a `scope` per route family (e.g. `order.create`, `order.refund`) so
 * keys can be safely reused by different clients without collision.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

export interface IdempotencyOptions {
  scope: string
  ttlMs?: number
  /** When true, `Idempotency-Key` is required (415-style 400 if missing). */
  required?: boolean
}

function hashBody(body: unknown): string {
  const canonical = JSON.stringify(body ?? null, Object.keys((body as object) ?? {}).sort())
  return createHash('sha256').update(canonical).digest('hex')
}

export function idempotency(options: IdempotencyOptions) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS

  return async function idempotencyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (SAFE_METHODS.has(req.method)) {
      next()
      return
    }

    const rawKey = req.header('Idempotency-Key') ?? req.header('idempotency-key')
    const key = typeof rawKey === 'string' ? rawKey.trim() : ''

    if (!key) {
      if (options.required) {
        res.status(400).json({ error: 'Idempotency-Key header is required' })
        return
      }
      next()
      return
    }

    if (key.length > 255 || !/^[\w.\-:]+$/u.test(key)) {
      res.status(400).json({ error: 'Invalid Idempotency-Key format' })
      return
    }

    const bodyHash = hashBody(req.body)
    const now = new Date()

    let existing
    try {
      existing = await IdempotencyKeyModel.findOne({ scope: options.scope, key }).lean()
    } catch (err) {
      logger.error({ err, scope: options.scope, key }, 'Idempotency lookup failed')
      next()
      return
    }

    if (existing) {
      if (existing.bodyHash !== bodyHash) {
        res.status(422).json({
          error: 'Idempotency-Key conflict: same key supplied with a different request body',
        })
        return
      }
      if (existing.expiresAt && existing.expiresAt > now) {
        res.status(existing.statusCode).json(existing.response)
        return
      }
    }

    // Wrap res.json so we capture the response body once the handler runs.
    const originalJson = res.json.bind(res)
    let captured = false
    res.json = function patchedJson(body: unknown): Response {
      if (!captured) {
        captured = true
        // Persist asynchronously — don't block the response.
        IdempotencyKeyModel.updateOne(
          { scope: options.scope, key },
          {
            $set: {
              bodyHash,
              statusCode: res.statusCode,
              response: body,
              expiresAt: new Date(now.getTime() + ttlMs),
            },
          },
          { upsert: true },
        ).catch((err: unknown) => {
          logger.error({ err, scope: options.scope, key }, 'Failed to persist idempotency record')
        })
      }
      return originalJson(body)
    }

    next()
  }
}
