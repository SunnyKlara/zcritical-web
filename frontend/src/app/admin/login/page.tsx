'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, User, AlertCircle, LogIn, ShieldCheck, KeyRound } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ApiError } from '@/lib/api'

type Stage =
  | { kind: 'credentials' }
  | {
      kind: 'twoFactor'
      twoFactorToken: string
      mode: 'totp' | 'backup'
      expiresAt: number
    }

export default function AdminLoginPage() {
  const router = useRouter()
  const { login, verifyTwoFactor, user, loading: authLoading } = useAuth()
  const [stage, setStage] = useState<Stage>({ kind: 'credentials' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/admin')
    }
  }, [authLoading, user, router])

  // Countdown for the 2FA challenge token.
  useEffect(() => {
    if (stage.kind !== 'twoFactor') {
      setSecondsLeft(null)
      return
    }
    const tick = () => {
      const remaining = Math.max(0, Math.round((stage.expiresAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) {
        setStage({ kind: 'credentials' })
        setError('两步验证已超时，请重新登录')
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [stage])

  function describeApiError(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
      if (err.status === 401) return '凭证不正确'
      if (err.status === 423) return '账户已被临时锁定，请稍后再试'
      if (err.status === 429) return '请求过于频繁，请稍后再试'
      if (err.status === 0) return '无法连接服务器，请检查后端是否启动'
      return err.message || fallback
    }
    return fallback
  }

  async function handleCredentialsSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const username = String(formData.get('username') || '')
    const password = String(formData.get('password') || '')

    try {
      const result = await login(username, password)
      if (result.kind === 'twoFactor') {
        setStage({
          kind: 'twoFactor',
          twoFactorToken: result.twoFactorToken,
          mode: 'totp',
          expiresAt: Date.now() + result.expiresIn * 1000,
        })
        setSubmitting(false)
        return
      }
      router.replace('/admin')
    } catch (err) {
      setError(describeApiError(err, '登录失败'))
      setSubmitting(false)
    }
  }

  async function handleTwoFactorSubmit(e: FormEvent<HTMLFormElement>) {
    if (stage.kind !== 'twoFactor') return
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const value = String(formData.get('value') || '').trim()

    try {
      await verifyTwoFactor({
        twoFactorToken: stage.twoFactorToken,
        ...(stage.mode === 'totp' ? { code: value } : { backupCode: value.toLowerCase() }),
      })
      router.replace('/admin')
    } catch (err) {
      setError(describeApiError(err, '验证失败'))
      setSubmitting(false)
    }
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
            {stage.kind === 'credentials' ? '管理后台登录' : '两步验证'}
          </p>
        </div>

        {stage.kind === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit} className="glass-card p-6 space-y-4">
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
          </form>
        ) : (
          <form onSubmit={handleTwoFactorSubmit} className="glass-card p-6 space-y-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              {stage.mode === 'totp'
                ? '请打开你的身份验证器应用，输入当前 6 位动态码。'
                : '输入一个 10 位备份恢复码（格式 xxxxx-xxxxx）。每个备份码只能使用一次。'}
            </p>

            <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                {stage.mode === 'totp' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    动态码
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    备份码
                  </>
                )}
              </span>
              <input
                key={stage.mode}
                name="value"
                type="text"
                inputMode={stage.mode === 'totp' ? 'numeric' : 'text'}
                pattern={stage.mode === 'totp' ? '\\d{6}' : '[0-9a-fA-F]{5}-[0-9a-fA-F]{5}'}
                placeholder={stage.mode === 'totp' ? '123456' : 'xxxxx-xxxxx'}
                required
                autoFocus
                autoComplete="one-time-code"
                disabled={submitting}
                className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-base tracking-widest text-white text-center focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
              />
            </label>

            {secondsLeft !== null && (
              <p className="text-[11px] text-gray-500 text-center">
                此挑战将在 {secondsLeft}s 后过期
              </p>
            )}

            {error && <ErrorBanner message={error} />}

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
                onClick={() => {
                  setError('')
                  setStage((current) =>
                    current.kind === 'twoFactor'
                      ? { ...current, mode: current.mode === 'totp' ? 'backup' : 'totp' }
                      : current,
                  )
                }}
                className="text-primary hover:text-primary-light transition-colors"
              >
                {stage.mode === 'totp' ? '改用备份码' : '改用动态码'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStage({ kind: 'credentials' })
                }}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                返回
              </button>
            </div>
          </form>
        )}

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
