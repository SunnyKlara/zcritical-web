'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

/**
 * Wraps next-themes provider with our defaults.
 * Theme classes are applied to <html>; consumers use Tailwind's dark: variants.
 */
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />
}
