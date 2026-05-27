/**
 * Composite middleware:
 *
 *   1. next-intl handles locale routing (zh / en).
 *   2. We additionally inject a per-request CSP nonce so inline scripts /
 *      styles can carry an unguessable token, removing the need for
 *      `'unsafe-inline'` on script-src in production.
 *
 * The nonce is exposed:
 *   - To server components via the `x-csp-nonce` request header (read with
 *     `headers().get('x-csp-nonce')` in the root layout).
 *   - In the response `Content-Security-Policy` header itself.
 *
 * In dev we keep `'unsafe-eval'` and `'unsafe-inline'` because Next's HMR
 * pipeline injects eval-style scripts. The strict policy only ships in prod.
 */
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { locales, defaultLocale, localePrefix } from './i18n/routing'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix,
})

const isProd = process.env.NODE_ENV === 'production'

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]!)
  return btoa(str)
}

function buildCsp(nonce: string): string {
  // `'strict-dynamic'` lets a nonce-marked script load further scripts without
  // each of them needing its own nonce. `https:` is the legacy fallback for
  // browsers that don't understand strict-dynamic.
  const scriptSrc = isProd
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' https:`
    : `'self' 'unsafe-eval' 'unsafe-inline' https:`

  // style-src keeps 'unsafe-inline' as a Tailwind / framer-motion compatibility
  // fallback. Modern browsers that honor `nonce-*` ignore unsafe-inline.
  const styleSrc = isProd ? `'self' 'nonce-${nonce}' 'unsafe-inline'` : `'self' 'unsafe-inline'`

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? ''
  const wsBackend = backend.replace(/^http/, 'ws')

  const directives: Record<string, string> = {
    'default-src': "'self'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'frame-ancestors': "'none'",
    'object-src': "'none'",
    'img-src': "'self' data: blob: https:",
    'font-src': "'self' data:",
    'media-src': "'self' blob: data:",
    'manifest-src': "'self'",
    'worker-src': "'self' blob:",
    'script-src': scriptSrc,
    'style-src': styleSrc,
    'connect-src': [
      "'self'",
      backend,
      wsBackend,
      'https://www.paypal.com',
      'https://www.sandbox.paypal.com',
      'https://api.paypal.com',
      'https://api.sandbox.paypal.com',
      'https://*.ingest.sentry.io',
    ]
      .filter(Boolean)
      .join(' '),
    'frame-src': "'self' https://www.paypal.com https://www.sandbox.paypal.com",
    'upgrade-insecure-requests': '',
  }

  return Object.entries(directives)
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join('; ')
}

export default function middleware(request: NextRequest): NextResponse {
  const nonce = generateNonce()
  const csp = buildCsp(nonce)

  // Forward the nonce to server components via a request header. Server
  // components can then `headers().get('x-csp-nonce')`.
  request.headers.set('x-csp-nonce', nonce)

  // Run next-intl first; if it returns a redirect/rewrite, attach our headers.
  const intlRes = intlMiddleware(request)
  const response =
    intlRes instanceof NextResponse
      ? intlRes
      : NextResponse.next({ request: { headers: request.headers } })

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('x-csp-nonce', nonce)
  return response
}

export const config = {
  // Match everything EXCEPT:
  // - /api/* (API routes)
  // - /_next/* (Next assets)
  // - /admin/* (admin uses single locale, no prefix)
  // - static files (icon.svg, sitemap.xml, robots.txt, manifest.webmanifest, .well-known/*)
  matcher: [
    '/((?!api|_next|_vercel|admin|.well-known|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif|webmanifest|xml|txt)).*)',
  ],
}
