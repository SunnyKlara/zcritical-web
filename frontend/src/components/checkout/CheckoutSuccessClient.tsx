'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { capturePayment, ApiError } from '@/lib/api'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/Button'

type Status = 'processing' | 'success' | 'error'

export default function CheckoutSuccessClient({ paypalOrderId }: { paypalOrderId: string }) {
  const t = useTranslations('CheckoutSuccess')
  const [status, setStatus] = useState<Status>('processing')
  const [orderNo, setOrderNo] = useState('')

  useEffect(() => {
    if (!paypalOrderId) {
      setStatus('error')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const result = await capturePayment(paypalOrderId)
        if (cancelled) return
        setOrderNo(result.orderNo)
        setStatus('success')
      } catch (err) {
        if (cancelled) return
        // eslint-disable-next-line no-console
        console.error('Capture failed:', err)
        if (err instanceof ApiError && err.status === 404) {
          // Order not found — likely retry of already-captured order
          setStatus('error')
        } else {
          setStatus('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [paypalOrderId])

  return (
    <section className="pt-32 pb-24 lg:pb-32 px-4">
      <div className="max-w-md mx-auto text-center">
        {status === 'processing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">{t('processing')}</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" aria-hidden />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">{t('title')}</h1>
            {orderNo && (
              <div className="my-6 p-4 rounded-xl bg-dark-800/50 border border-white/10">
                <p className="text-xs text-gray-500 mb-1">{t('orderNo')}</p>
                <p className="text-lg font-mono font-bold text-primary">{orderNo}</p>
              </div>
            )}
            <Link href={`/order-lookup?orderNo=${encodeURIComponent(orderNo)}`}>
              <Button>
                {t('viewOrderCta')}
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>
            </Link>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-accent" aria-hidden />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">{t('errorTitle')}</h1>
            <p className="text-sm text-gray-400 mb-6">{t('errorDesc')}</p>
            <Link href="/support">
              <Button variant="ghost">support</Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}
