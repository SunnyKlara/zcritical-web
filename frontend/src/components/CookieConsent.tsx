'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Cookie, X } from 'lucide-react'
import { Link } from '@/i18n/navigation'

const CONSENT_KEY = 'critical:cookie-consent'

type ConsentValue = 'accepted' | 'rejected' | null

function getStoredConsent(): ConsentValue {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(CONSENT_KEY)
  if (value === 'accepted' || value === 'rejected') return value
  return null
}

function setStoredConsent(value: Exclude<ConsentValue, null>): void {
  window.localStorage.setItem(CONSENT_KEY, value)
}

export default function CookieConsent() {
  const t = useTranslations('Cookie')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (getStoredConsent() === null) {
      const timer = setTimeout(() => setShow(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  function handleAccept() {
    setStoredConsent('accepted')
    setShow(false)
  }

  function handleReject() {
    setStoredConsent('rejected')
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md z-[60]"
          role="dialog"
          aria-labelledby="cookie-title"
          aria-describedby="cookie-desc"
        >
          <div className="glass-card p-5 shadow-2xl">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-4 h-4 text-primary" aria-hidden />
              </div>
              <div className="flex-1">
                <h3 id="cookie-title" className="text-sm font-semibold text-white mb-1">
                  {t('title')}
                </h3>
                <p id="cookie-desc" className="text-xs text-gray-400 leading-relaxed">
                  {t('description')}{' '}
                  <Link href="/privacy" className="text-primary hover:underline">
                    {t('viewPolicy')}
                  </Link>
                </p>
              </div>
              <button
                type="button"
                onClick={handleReject}
                className="text-gray-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                aria-label={t('close')}
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-dark-900 text-xs font-semibold hover:bg-primary-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('accept')}
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 rounded-lg border border-white/10 text-xs text-gray-400 hover:border-white/30 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('reject')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
