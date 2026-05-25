import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

/**
 * Attaches a stable request ID to every request.
 *
 * - If client sends `X-Request-Id` (e.g. from Cloudflare or upstream LB), we honor it.
 * - Otherwise we generate a UUID v4.
 *
 * The ID is:
 *   - exposed back to the client via `X-Request-Id` response header
 *   - attached to `req.id` for downstream middleware (logger, error handler)
 *   - included in pino log lines (genReqId hooks into this)
 *
 * Why: makes debugging across logs/Sentry/client reports trivial — share one ID.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string
    }
  }
}

const REQUEST_ID_HEADER = 'x-request-id'
const MAX_INCOMING_LENGTH = 200 // reject absurdly long values

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER]
  let id: string
  if (
    typeof incoming === 'string' &&
    incoming.length > 0 &&
    incoming.length <= MAX_INCOMING_LENGTH &&
    // Only allow safe characters (alphanumeric + dashes/underscores)
    /^[A-Za-z0-9_-]+$/.test(incoming)
  ) {
    id = incoming
  } else {
    id = randomUUID()
  }
  req.id = id
  res.setHeader('X-Request-Id', id)
  next()
}
