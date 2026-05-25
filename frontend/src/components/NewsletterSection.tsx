'use client'

import { useState, useRef, type FormEvent } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { createLead, ApiError } from '@/lib/api'

export default function NewsletterSection() {
  const t = useTranslations('Newsletter')
  const locale = useLocale()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('submitting')
    setError('')

    try {
      await createLead({
        name: 'Newsletter Subscriber',
        email: email.trim(),
        message: 'Subscribed to Critical newsletter',
        source: 'newsletter',
        locale: locale as 'zh' | 'en',
      })
      setState('success')
      setEmail('')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) setError(t('errorRateLimit'))
        else if (err.status === 400) setError(t('errorValidation'))
        else setError(t('errorGeneric'))
      } else {
        setError(t('errorGeneric'))
      }
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  return (
    <section ref={ref} className="relative py-16 lg:py-20" aria-labelledby="newsletter-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="glass-card p-8 sm:p-10 text-center relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" aria-hidden />
            </div>
            <h2 id="newsletter-heading" className="text-2xl sm:text-3xl font-bold mb-3">
              {t('title')}
            </h2>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">{t('subtitle')}</p>

            <AnimatePresence mode="wait">
              {state === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-center gap-2 text-green-400 py-3"
                  role="status"
                >
                  <CheckCircle2 className="w-5 h-5" aria-hidden />
                  <span className="text-sm">{t('successMsg')}</span>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="max-w-md mx-auto"
                >
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label htmlFor="newsletter-email" className="sr-only">
                      {t('placeholder')}
                    </label>
                    <input
                      id="newsletter-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('placeholder')}
                      required
                      disabled={state === 'submitting'}
                      className="flex-1 px-4 py-3 rounded-button bg-dark-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary transition-colors disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={state === 'submitting' || !email.trim()}
                      className="btn-primary justify-center sm:flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state === 'submitting' ? (
                        <div
                          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                          aria-hidden
                        />
                      ) : (
                        <>
                          <Send className="w-4 h-4" aria-hidden />
                          {t('submit')}
                        </>
                      )}
                    </button>
                  </div>
                  {state === 'error' && error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-center justify-center gap-1.5 text-xs text-red-400"
                      role="alert"
                    >
                      <AlertCircle className="w-3.5 h-3.5" aria-hidden />
                      {error}
                    </motion.p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>

            <p className="text-xs text-gray-600 mt-4">{t('privacy')}</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
