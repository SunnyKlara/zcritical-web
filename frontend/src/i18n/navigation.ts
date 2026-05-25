import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * Locale-aware Link / useRouter / redirect / usePathname.
 * Always import from here instead of next/link or next/navigation.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
