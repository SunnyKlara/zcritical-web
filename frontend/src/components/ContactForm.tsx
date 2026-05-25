'use client'

import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import {
  Mail,
  Building,
  User,
  MessageSquare,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { createLead, ApiError } from '@/lib/api'
import { Link } from '@/i18n/navigation'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function ContactForm() {
  const t = useTranslations('Contact')
  const tFooter = useTranslations('Footer')
  const locale = useLocale()
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('submitting')
    setErrorMsg('')

    const formData = new FormData(e.currentTarget)
    const payload = {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      company: String(formData.get('company') || '') || undefined,
      phone: String(formData.get('phone') || '') || undefined,
      message: String(formData.get('message') || ''),
      website: String(formData.get('website') || ''),
      source: 'website',
      locale: locale as 'zh' | 'en',
    }

    try {
      await createLead(payload)
      setState('success')
      e.currentTarget.reset()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) setErrorMsg(t('errorRateLimit'))
        else if (err.status === 400) setErrorMsg(t('errorValidation'))
        else if (err.status === 0) setErrorMsg(t('errorNetwork'))
        else setErrorMsg(err.message || t('errorGeneric'))
      } else {
        setErrorMsg(t('errorGeneric'))
      }
      setState('error')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8 text-center"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" aria-hidden />
            <h3 className="text-2xl font-bold text-white mb-2">{t('successTitle')}</h3>
            <p className="text-gray-400 mb-6">{t('successDesc')}</p>
            <button onClick={() => setState('idle')} className="btn-ghost" type="button">
              {t('sendAnother')}
            </button>
          </motion.div>
        )}

        {state !== 'success' && (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 sm:p-8 space-y-5"
            noValidate
          >
            {/* Honeypot */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="absolute opacity-0 pointer-events-none -z-10 w-0 h-0"
              aria-hidden="true"
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                icon={User}
                label={t('name')}
                name="name"
                type="text"
                required
                placeholder={t('namePlaceholder')}
                disabled={state === 'submitting'}
              />
              <FormField
                icon={Mail}
                label={t('email')}
                name="email"
                type="email"
                required
                placeholder={t('emailPlaceholder')}
                disabled={state === 'submitting'}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                icon={Building}
                label={t('company')}
                name="company"
                type="text"
                placeholder={t('companyPlaceholder')}
                disabled={state === 'submitting'}
              />
              <FormField
                icon={Phone}
                label={t('phone')}
                name="phone"
                type="tel"
                placeholder={t('phonePlaceholder')}
                disabled={state === 'submitting'}
              />
            </div>

            <FormField
              icon={MessageSquare}
              label={t('message')}
              name="message"
              required
              placeholder={t('messagePlaceholder')}
              textarea
              disabled={state === 'submitting'}
            />

            {state === 'error' && errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={state === 'submitting'}
              className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === 'submitting' ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                    aria-hidden
                  />
                  {t('submitting')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden />
                  {t('submit')}
                </>
              )}
            </button>

            <p className="text-xs text-gray-600 text-center">
              {t('privacyConsent')}{' '}
              <Link href="/privacy" className="underline hover:text-gray-400">
                {tFooter('privacy')}
              </Link>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

interface FormFieldProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  textarea?: boolean
}

function FormField({
  icon: Icon,
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
  disabled = false,
  textarea = false,
}: FormFieldProps) {
  const id = `contact-${name}`
  return (
    <div className="block">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5"
      >
        <Icon className="w-3.5 h-3.5" aria-hidden />
        {label}
        {required && (
          <span className="text-primary" aria-label="required">
            *
          </span>
        )}
      </label>
      {textarea ? (
        <textarea
          id={id}
          name={name}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
          className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary transition-colors disabled:opacity-50 resize-none"
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary transition-colors disabled:opacity-50"
        />
      )}
    </div>
  )
}
