import type { MetadataRoute } from 'next'
import { locales, defaultLocale } from '@/i18n/routing'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://critical.bike'

const routes: {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/firmware', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/support', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/download', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  // Generate one entry per route × locale, with hreflang alternates
  const result: MetadataRoute.Sitemap = []
  for (const r of routes) {
    for (const locale of locales) {
      const localePath =
        locale === defaultLocale ? r.path : `/${locale}${r.path === '/' ? '' : r.path}`
      const url = `${SITE_URL}${localePath}`.replace(/\/$/, '') || SITE_URL

      // alternates.languages — Google uses these for hreflang
      const languages: Record<string, string> = {}
      for (const altLocale of locales) {
        const altPath =
          altLocale === defaultLocale ? r.path : `/${altLocale}${r.path === '/' ? '' : r.path}`
        const altUrl = `${SITE_URL}${altPath}`.replace(/\/$/, '') || SITE_URL
        languages[altLocale === 'zh' ? 'zh-CN' : 'en-US'] = altUrl
      }

      result.push({
        url,
        lastModified,
        changeFrequency: r.changeFrequency,
        priority: r.priority,
        alternates: { languages },
      })
    }
  }

  return result
}
