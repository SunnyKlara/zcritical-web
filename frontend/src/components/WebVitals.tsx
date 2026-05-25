'use client'

import { useReportWebVitals } from 'next/web-vitals'

/**
 * Reports Core Web Vitals to console (and Sentry/Analytics when configured).
 *
 * Metrics tracked:
 * - LCP (Largest Contentful Paint) — target <= 2.5s
 * - FID (First Input Delay) — target <= 100ms
 * - CLS (Cumulative Layout Shift) — target <= 0.1
 * - INP (Interaction to Next Paint) — target <= 200ms
 * - TTFB (Time to First Byte)
 * - FCP (First Contentful Paint)
 */
export default function WebVitals() {
  useReportWebVitals((metric) => {
    // Dev-time visibility
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric.rating)
    }

    // Production: send to analytics endpoint (when configured)
    if (process.env.NEXT_PUBLIC_VITALS_URL) {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        url: window.location.href,
      })
      // Use sendBeacon for reliability on page unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon(process.env.NEXT_PUBLIC_VITALS_URL, body)
      } else {
        fetch(process.env.NEXT_PUBLIC_VITALS_URL, {
          body,
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {
          // Silently swallow — vitals are best-effort
        })
      }
    }
  })

  return null
}
