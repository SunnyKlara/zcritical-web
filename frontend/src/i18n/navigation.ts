import { createSharedPathnamesNavigation } from 'next-intl/navigation'
import { locales, localePrefix } from './routing'

/**
 * Locale-aware navigation primitives.
 *
 * Always import Link / useRouter / usePathname / redirect from here instead
 * of `next/link` or `next/navigation`. This ensures locale prefix is preserved
 * across navigation.
 */
export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation({
  locales,
  localePrefix,
})
