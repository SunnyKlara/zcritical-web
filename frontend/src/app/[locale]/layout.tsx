import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { locales, type Locale } from '@/i18n/routing'
import { SkipLink } from '@/components/SkipLink'
import CookieConsent from '@/components/CookieConsent'
import ChatWidgetWrapper from '@/components/ChatWidgetWrapper'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const { locale } = params
  if (!(locales as readonly string[]).includes(locale)) return {}

  const tBrand = await getTranslations({ locale, namespace: 'Brand' })
  const tHero = await getTranslations({ locale, namespace: 'Hero' })

  return {
    title: {
      default: `${tBrand('name')} — ${tBrand('tagline')}`,
      template: `%s | ${tBrand('name')}`,
    },
    description: tHero('subtitle'),
    openGraph: {
      title: `${tBrand('name')} — ${tBrand('tagline')}`,
      description: tHero('subtitle'),
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const { locale } = params

  if (!(locales as readonly string[]).includes(locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale as Locale} messages={messages}>
      <SkipLink />
      {children}
      <ChatWidgetWrapper />
      <CookieConsent />
    </NextIntlClientProvider>
  )
}
