'use client'

import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function ContactForm() {
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
      // Honeypot — must remain empty. Browsers fill, bots fill with junk.
      website: String(formData.get('website') || ''),
      source: 'website',
      locale: 'zh' as const,
    }

    try {
      await createLead(payload)
      setState('success')
      e.currentTarget.reset()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setErrorMsg('提交过于频繁，请稍后再试')
        } else if (err.status === 400) {
          setErrorMsg('表单数据有误，请检查后重新提交')
        } else if (err.status === 0) {
          setErrorMsg('网络连接失败，请检查后端服务是否启动')
        } else {
          setErrorMsg(err.message || '提交失败，请稍后再试')
        }
      } else {
        setErrorMsg('未知错误，请稍后再试')
      }
      setState('error')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success state */}
      <AnimatePresence mode="wait">
        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8 text-center"
          >
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">提交成功</h3>
            <p className="text-gray-400 mb-6">我们已收到您的留言，会在 1-2 个工作日内联系您</p>
            <button onClick={() => setState('idle')} className="btn-ghost">
              再发一条
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
          >
            {/* Honeypot — invisible to users, attractive to bots */}
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
                label="姓名"
                name="name"
                type="text"
                required
                placeholder="您的称呼"
                disabled={state === 'submitting'}
              />
              <FormField
                icon={Mail}
                label="邮箱"
                name="email"
                type="email"
                required
                placeholder="example@email.com"
                disabled={state === 'submitting'}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                icon={Building}
                label="公司"
                name="company"
                type="text"
                placeholder="可选"
                disabled={state === 'submitting'}
              />
              <FormField
                icon={Phone}
                label="电话"
                name="phone"
                type="tel"
                placeholder="可选"
                disabled={state === 'submitting'}
              />
            </div>

            <FormField
              icon={MessageSquare}
              label="留言"
              name="message"
              required
              placeholder="想了解什么？批发价格、技术细节、合作意向..."
              textarea
              disabled={state === 'submitting'}
            />

            {/* Error message */}
            {state === 'error' && errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  发送留言
                </>
              )}
            </button>

            <p className="text-xs text-gray-600 text-center">
              提交即表示您同意我们的{' '}
              <a href="#" className="underline hover:text-gray-400">
                隐私政策
              </a>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Form Field component ────────────────────────────────────────────────────

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
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
        {required && <span className="text-primary">*</span>}
      </span>
      {textarea ? (
        <textarea
          name={name}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
          className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50 resize-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
        />
      )}
    </label>
  )
}
