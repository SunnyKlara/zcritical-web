'use client'

import { useState, useRef, type FormEvent } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { createLead, ApiError } from '@/lib/api'

/**
 * Newsletter signup section.
 * Reuses the /api/leads endpoint with source="newsletter" so subscribers
 * land in the same admin inbox as full inquiries (lower friction signup).
 */
export default function NewsletterSection() {
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
      // Use lead endpoint with newsletter source — minimal payload
      await createLead({
        name: 'Newsletter Subscriber',
        email: email.trim(),
        message: 'Subscribed to Critical newsletter',
        source: 'newsletter',
        locale: 'zh',
      })
      setState('success')
      setEmail('')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('订阅过于频繁，请稍后再试')
        } else if (err.status === 400) {
          setError('邮箱格式有误')
        } else {
          setError('订阅失败，请稍后再试')
        }
      } else {
        setError('网络错误')
      }
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  return (
    <section ref={ref} className="relative py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="glass-card p-8 sm:p-10 text-center relative overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              订阅产品<span className="text-gradient">动态</span>
            </h2>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
              新功能发布、固件升级、限时优惠 — 第一时间送达您的邮箱。我们尊重您的隐私，可随时退订。
            </p>

            <AnimatePresence mode="wait">
              {state === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-center gap-2 text-green-400 py-3"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm">订阅成功！感谢您的关注</span>
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
                      邮箱地址
                    </label>
                    <input
                      id="newsletter-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      disabled={state === 'submitting'}
                      className="flex-1 px-4 py-3 rounded-button bg-dark-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={state === 'submitting' || !email.trim()}
                      className="btn-primary justify-center sm:flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state === 'submitting' ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          订阅
                        </>
                      )}
                    </button>
                  </div>
                  {state === 'error' && error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-center justify-center gap-1.5 text-xs text-red-400"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {error}
                    </motion.p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>

            <p className="text-xs text-gray-600 mt-4">
              提交即表示您同意我们的{' '}
              <a href="/privacy" className="underline hover:text-gray-400">
                隐私政策
              </a>
              。我们保证不发送垃圾邮件。
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
