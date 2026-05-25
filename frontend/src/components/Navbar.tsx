'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

// Anchor links (homepage sections)
const sectionLinks = [
  { href: '#overview', label: '产品' },
  { href: '#features', label: '功能' },
  { href: '#app', label: 'APP' },
  { href: '#specs', label: '规格' },
  { href: '#usecases', label: '场景' },
  { href: '#contact', label: '联系' },
]

// Page links (independent routes)
const pageLinks = [
  { href: '/download', label: '下载' },
  { href: '/support', label: '帮助' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // For anchor links: if on homepage, scroll; if on subpage, navigate to /#section
  const getHref = (link: { href: string }) => {
    if (link.href.startsWith('#')) {
      return isHome ? link.href : `/${link.href}`
    }
    return link.href
  }

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
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-bold tracking-wider">CRITICAL</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {/* Section links */}
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={getHref(link)}
              className="px-3 py-1.5 text-sm text-gray-300 hover:text-primary rounded-lg hover:bg-white/5 transition-all duration-200"
            >
              {link.label}
            </a>
          ))}

          {/* Divider */}
          <div className="w-px h-4 bg-white/10 mx-2" />

          {/* Page links */}
          {pageLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                isActivePageLink(link.href)
                  ? 'text-primary bg-primary/10'
                  : 'text-gray-300 hover:text-primary hover:bg-white/5'
              }`}
            >
              {link.label}
            </a>
          ))}

          {/* CTA */}
          <a
            href={isHome ? '#hero' : '/'}
            className="ml-4 px-4 py-2 bg-primary/10 border border-primary/50 rounded-lg text-primary text-sm hover:bg-primary/20 transition-all"
          >
            立即购买
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <span
            className={`w-6 h-0.5 bg-white transition-transform ${
              mobileOpen ? 'rotate-45 translate-y-2' : ''
            }`}
          />
          <span
            className={`w-6 h-0.5 bg-white transition-opacity ${mobileOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`w-6 h-0.5 bg-white transition-transform ${
              mobileOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
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
              {/* Section links */}
              <p className="text-[10px] uppercase tracking-wider text-gray-500 px-3 pt-1 pb-2">
                首页
              </p>
              {sectionLinks.map((link) => (
                <a
                  key={link.href}
                  href={getHref(link)}
                  onClick={() => setMobileOpen(false)}
                  className="text-gray-300 hover:text-primary px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </a>
              ))}

              {/* Divider */}
              <div className="h-px bg-white/5 my-2" />

              {/* Page links */}
              <p className="text-[10px] uppercase tracking-wider text-gray-500 px-3 pt-1 pb-2">
                更多
              </p>
              {pageLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    isActivePageLink(link.href)
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-300 hover:text-primary hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </a>
              ))}

              {/* CTA */}
              <a
                href={isHome ? '#hero' : '/'}
                className="mt-3 px-4 py-2.5 bg-primary/10 border border-primary/50 rounded-lg text-primary text-center"
              >
                立即购买
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
