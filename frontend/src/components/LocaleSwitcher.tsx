'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { Globe } from 'lucide-react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

/**
 * Locale switcher button. Replaces current locale in URL preserving the path.
 */
export default function LocaleSwitcher({ className = '' }: { className?: string }) {
  const t = useTranslations('LocaleSwitcher')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleSwitch() {
    const next =
      routing.locales[
        (routing.locales.indexOf(locale as (typeof routing.locales)[number]) + 1) %
          routing.locales.length
      ]
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  const otherLocale = locale === 'zh' ? 'en' : 'zh'

  return (
    <button
      onClick={handleSwitch}
      disabled={isPending}
      aria-label={t('label')}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-primary hover:bg-white/5 transition-colors disabled:opacity-50 ${className}`}
    >
      <Globe className="w-3.5 h-3.5" />
      <span className="font-medium uppercase">{otherLocale}</span>
    </button>
  )
}
