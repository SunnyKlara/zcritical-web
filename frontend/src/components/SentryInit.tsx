'use client'

import { useEffect } from 'react'
import { initSentryBrowser } from '@/lib/sentry'

/** Initialize Sentry (browser) on mount when DSN is configured. */
export default function SentryInit() {
  useEffect(() => {
    void initSentryBrowser()
  }, [])
  return null
}
