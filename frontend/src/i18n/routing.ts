import { defineRouting } from 'next-intl/routing'

/**
 * i18n routing configuration.
 *
 * - Default locale (zh) is served at root paths (no /zh prefix).
 * - English content lives under /en.
 * - All locales share the same routes — only the content differs.
 */
export const routing = defineRouting({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  // 'as-needed' = hide prefix for default locale, show for others
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]
