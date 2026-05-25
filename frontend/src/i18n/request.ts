import { getRequestConfig } from 'next-intl/server'
import { locales, defaultLocale, type Locale } from './routing'

export default getRequestConfig(async ({ locale }) => {
  // Validate the incoming locale
  const resolved: Locale = (locales as readonly string[]).includes(locale ?? '')
    ? (locale as Locale)
    : defaultLocale

  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
  }
})
