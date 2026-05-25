'use client'

import { useTranslations } from 'next-intl'

/**
 * Accessibility skip-to-content link.
 * Visible only when keyboard-focused (sr-only otherwise).
 */
export function SkipLink() {
  const t = useTranslations('SkipLink')
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-dark-900 focus:rounded-lg focus:font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {t('label')}
    </a>
  )
}
