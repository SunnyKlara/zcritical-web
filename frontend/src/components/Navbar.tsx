'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import LocaleSwitcher from './LocaleSwitcher'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const t = useTranslations('Nav')
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Anchor links to homepage sections
  const sectionLinks = [
    { hash: '#overview', label: t('product') },
    { hash: '#features', label: t('features') },
    { hash: '#app', label: t('app') },
    { hash: '#specs', label: t('specs') },
    { hash: '#usecases', label: t('useCases') },
    { hash: '#contact', label: t('contact') },
  ]

  // Independent page routes (locale-aware)
  const pageLinks = [
    { href: '/download' as const, label: t('download') },
    { href: '/support' as const, label: t('support') },
  ]

  const isActivePageLink = (href: string) => pathname === href

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass py-3' : 'py-5 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-bold tracking-wider text-text-primary">CRITICAL</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {sectionLinks.map((link) =>
            isHome ? (
              <a
                key={link.hash}
                href={link.hash}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-primary rounded-lg hover:bg-surface-card transition-all duration-200"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.hash}
                href={`/${link.hash}` as `/${string}`}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-primary rounded-lg hover:bg-surface-card transition-all duration-200"
              >
                {link.label}
              </Link>
            ),
          )}

          <div className="w-px h-4 bg-surface-border mx-2" />

          {pageLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                isActivePageLink(link.href)
                  ? 'text-primary bg-primary/10'
                  : 'text-text-secondary hover:text-primary hover:bg-surface-card'
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="w-px h-4 bg-surface-border mx-2" />

          <ThemeToggle />
          <LocaleSwitcher />

          {isHome ? (
            <a
              href="#hero"
              className="ml-2 px-4 py-2 bg-primary/10 border border-primary/50 rounded-lg text-primary text-sm hover:bg-primary/20 transition-all"
            >
              {t('buyNow')}
            </a>
          ) : (
            <Link
              href="/"
              className="ml-2 px-4 py-2 bg-primary/10 border border-primary/50 rounded-lg text-primary text-sm hover:bg-primary/20 transition-all"
            >
              {t('buyNow')}
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          aria-label={t('menu')}
          aria-expanded={mobileOpen}
        >
          <span
            className={`w-6 h-0.5 bg-text-primary transition-transform ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`}
          />
          <span
            className={`w-6 h-0.5 bg-text-primary transition-opacity ${mobileOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`w-6 h-0.5 bg-text-primary transition-transform ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass mt-2 mx-4 rounded-xl overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-1">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary px-3 pt-1 pb-2">
                {t('homeSection')}
              </p>
              {sectionLinks.map((link) =>
                isHome ? (
                  <a
                    key={link.hash}
                    href={link.hash}
                    onClick={() => setMobileOpen(false)}
                    className="text-text-secondary hover:text-primary px-3 py-2 rounded-lg hover:bg-surface-card transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.hash}
                    href={`/${link.hash}` as `/${string}`}
                    onClick={() => setMobileOpen(false)}
                    className="text-text-secondary hover:text-primary px-3 py-2 rounded-lg hover:bg-surface-card transition-colors"
                  >
                    {link.label}
                  </Link>
                ),
              )}

              <div className="h-px bg-surface-divider my-2" />

              <p className="text-[10px] uppercase tracking-wider text-text-tertiary px-3 pt-1 pb-2">
                {t('more')}
              </p>
              {pageLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    isActivePageLink(link.href)
                      ? 'text-primary bg-primary/10'
                      : 'text-text-secondary hover:text-primary hover:bg-surface-card'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="h-px bg-surface-divider my-2" />

              <div className="flex items-center gap-2 px-3 py-1">
                <ThemeToggle />
                <LocaleSwitcher />
              </div>

              {isHome ? (
                <a
                  href="#hero"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 px-4 py-2.5 bg-primary/10 border border-primary/50 rounded-lg text-primary text-center"
                >
                  {t('buyNow')}
                </a>
              ) : (
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 px-4 py-2.5 bg-primary/10 border border-primary/50 rounded-lg text-primary text-center"
                >
                  {t('buyNow')}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
