'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, User, AlertCircle, LogIn, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ApiError } from '@/lib/api'

type Step = 'credentials' | 'totp' | 'recovery'

export default function AdminLoginPage() {
  const router = useRouter()
  const { login, verify2FA, user, loading: authLoading } = useAuth()

  const [step, setStep] = useState<Step>('credentials')
  const [mfaToken, setMfaToken] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/admin')
    }
  }, [authLoading, user, router])

  function mapErrorMessage(err: unknown, ctx: 'login' | '2fa'): string {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        return ctx === 'login' ? '用户名或密码错误' : '验证码错误'
      }
      if (err.status === 429) {
        return ctx === 'login' ? '登录尝试过于频繁，请稍后再试' : '验证次数过多，请稍后再试'
      }
      if (err.status === 0) return '无法连接服务器，请检查后端是否启动'
      return err.message || (ctx === 'login' ? '登录失败' : '验证失败')
    }
    return '未知错误，请重试'
  }

  async function handleCredentialsSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const username = String(formData.get('username') || '')
    const password = String(formData.get('password') || '')

    try {
      const outcome = await login(username, password)
      if (outcome.status === 'authenticated') {
        router.replace('/admin')
        return
      }
      // 2FA required — switch to step 2
      setMfaToken(outcome.mfaToken)
      setStep('totp')
      setAttemptsRemaining(null)
      setSubmitting(false)
    } catch (err) {
      setError(mapErrorMessage(err, 'login'))
      setSubmitting(false)
    }
  }

  async function handle2faSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const value = String(formData.get('code') || formData.get('recoveryCode') || '').trim()

    try {
      if (step === 'totp') {
        await verify2FA(mfaToken, { code: value })
      } else {
        await verify2FA(mfaToken, { recoveryCode: value.toUpperCase() })
      }
      router.replace('/admin')
    } catch (err) {
      const remaining = (err as { attemptsRemaining?: number }).attemptsRemaining
      if (typeof remaining === 'number') {
        setAttemptsRemaining(remaining)
        if (remaining === 0) {
          // Token exhausted — bounce back to credentials step
          setError('验证次数已耗尽，请重新登录')
          setMfaToken('')
          setStep('credentials')
          setSubmitting(false)
          return
        }
      }
      setError(mapErrorMessage(err, '2fa'))
      setSubmitting(false)
    }
  }

  function backToCredentials() {
    setStep('credentials')
    setMfaToken('')
    setError('')
    setAttemptsRemaining(null)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-dark-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/50 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">C</span>
            </div>
            <span className="text-2xl font-bold tracking-wider">CRITICAL</span>
          </div>
          <p className="text-sm text-gray-500">
            {step === 'credentials' ? '管理后台登录' : '两步验证'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'credentials' && (
            <motion.form
              key="credentials"
              onSubmit={handleCredentialsSubmit}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 space-y-4"
            >
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <User className="w-3.5 h-3.5" />
                  用户名
                </span>
                <input
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  autoFocus
                  disabled={submitting}
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                />
              </label>

              <label className="block">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  密码
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={submitting}
                  className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                />
              </label>

              {error && <ErrorBanner message={error} />}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    登录
                  </>
                )}
              </button>
            </motion.form>
          )}

          {(step === 'totp' || step === 'recovery') && (
            <motion.form
              key={step}
              onSubmit={handle2faSubmit}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 space-y-4"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-gray-300">
                {step === 'totp' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                    <span>
                      请输入身份验证器 App（如 Google Authenticator）显示的 6 位动态验证码
                    </span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                    <span>请输入一组备份恢复码（XXXX-XXXX-XXXX 格式），用过即失效</span>
                  </>
                )}
              </div>

              {step === 'totp' ? (
                <label className="block">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    动态验证码
                  </span>
                  <input
                    name="code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={submitting}
                    placeholder="000000"
                    className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-center text-2xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    恢复码
                  </span>
                  <input
                    name="recoveryCode"
                    type="text"
                    pattern="[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}"
                    maxLength={14}
                    required
                    autoFocus
                    disabled={submitting}
                    placeholder="XXXX-XXXX-XXXX"
                    className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-center text-base tracking-[0.2em] font-mono text-white uppercase focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  />
                </label>
              )}

              {error && (
                <div className="space-y-1">
                  <ErrorBanner message={error} />
                  {attemptsRemaining !== null && attemptsRemaining > 0 && (
                    <p className="text-[11px] text-gray-500 px-1">
                      剩余尝试次数：{attemptsRemaining}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    验证中...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    验证
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={backToCredentials}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  返回登录
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(step === 'totp' ? 'recovery' : 'totp')
                    setError('')
                    setAttemptsRemaining(null)
                  }}
                  className="text-primary hover:underline"
                >
                  {step === 'totp' ? '使用恢复码登录' : '使用动态验证码'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-gray-600 mt-6">仅限授权人员访问</p>
      </motion.div>
    </main>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </motion.div>
  )
}
