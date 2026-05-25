import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale, localePrefix } from './i18n/routing'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix,
})

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
