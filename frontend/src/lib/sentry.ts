/**
 * Lightweight Sentry browser integration.
 *
 * Loaded conditionally — if NEXT_PUBLIC_SENTRY_DSN is set, the SDK is
 * dynamically imported on the client. We avoid bundling Sentry into the
 * critical path so the marketing site stays fast.
 *
 * To enable in production:
 *   1. pnpm --filter frontend add @sentry/browser
 *   2. Set NEXT_PUBLIC_SENTRY_DSN in .env.local
 *
 * For full server-side instrumentation, install @sentry/nextjs and follow
 * its setup wizard. This file is the minimal client-only fallback.
 */

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

let initialized = false

type SentryShape = {
  init(options: Record<string, unknown>): void
  captureException(err: unknown): void
}

/**
 * Load @sentry/browser at runtime via a string indirection so webpack does
 * NOT try to resolve the module at build time. This makes the SDK a
 * true optional peer dependency.
 */
async function loadSentry(): Promise<SentryShape | null> {
  try {
    const moduleName = ['@sentry', 'browser'].join('/')
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function('m', 'return import(m)') as (
      m: string,
    ) => Promise<SentryShape>
    return await dynamicImport(moduleName)
  } catch {
    return null
  }
}

export async function initSentryBrowser(): Promise<void> {
  if (initialized || !DSN || typeof window === 'undefined') return
  const Sentry = await loadSentry()
  if (!Sentry) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(
        'Sentry DSN configured but @sentry/browser not installed. Run: pnpm --filter frontend add @sentry/browser',
      )
    }
    return
  }
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    beforeSend(event: { request?: { cookies?: unknown; headers?: Record<string, unknown> } }) {
      // Strip cookies and auth headers — never send PII to Sentry
      if (event.request) {
        delete event.request.cookies
        if (event.request.headers) {
          delete event.request.headers.Authorization
          delete event.request.headers.Cookie
        }
      }
      return event
    },
  })
  initialized = true
}

export async function captureException(err: unknown): Promise<void> {
  if (!initialized) return
  const Sentry = await loadSentry()
  Sentry?.captureException(err)
}
