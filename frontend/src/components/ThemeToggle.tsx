'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Sun, Moon, Monitor } from 'lucide-react'

const THEMES = ['light', 'dark', 'system'] as const
type Theme = (typeof THEMES)[number]

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const t = useTranslations('Theme')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    // Avoid hydration mismatch — render placeholder
    return <div className={`w-8 h-8 ${className}`} aria-hidden />
  }

  const current: Theme = (theme as Theme) || 'system'
  const next: Theme = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]!
  const Icon = ICONS[current]

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={t('toggle')}
      title={`${t(current)} → ${t(next)}`}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-300 hover:text-primary hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}
