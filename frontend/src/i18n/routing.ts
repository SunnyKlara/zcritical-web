export const locales = ['zh', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'zh'

/**
 * Locale prefix strategy: "as-needed" — default locale (zh) at root paths,
 * other locales get a prefix (/en/...).
 */
export const localePrefix = 'as-needed' as const
