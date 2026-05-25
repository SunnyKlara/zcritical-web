/**
 * Sentry integration for the backend (Sentry SDK v8).
 *
 * IMPORTANT: `initSentry()` MUST be invoked before any other business import
 * in `index.ts` so that Sentry's automatic instrumentation (http, express,
 * mongodb, etc.) can patch the modules on load.
 */
import * as Sentry from '@sentry/node'
import type { Express, RequestHandler } from 'express'
import { env, isProd } from '../config/env'
import { logger } from '../config/logger'

let initialized = false

export function initSentry(): void {
  if (initialized) return
  if (!env.SENTRY_DSN) return

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    includeLocalVariables: !isProd,
  })

  initialized = true
  logger.info('Sentry initialized')
}

export function captureException(err: unknown): void {
  if (initialized) Sentry.captureException(err)
}

/**
 * Install Sentry's Express error handler. In v8 the request handler is
 * provided automatically by the http integration when `init()` runs early,
 * so we only need to wire the error handler at the tail of the middleware
 * chain (before the project-level error handler).
 */
export function installSentryExpressErrorHandler(app: Express): void {
  if (!initialized) return
  Sentry.setupExpressErrorHandler(app)
}

/**
 * Backwards-compat no-op kept so `server.ts` wiring keeps compiling during
 * the incremental migration. v8 does the request-level work via automatic
 * http-integration; this middleware is intentionally a pass-through.
 */
export const sentryRequestHandler: RequestHandler = (_req, _res, next) => {
  next()
}

export { Sentry }
