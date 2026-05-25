'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, User, AlertCircle, LogIn } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ApiError } from '@/lib/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const { login, user, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/admin')
    }
  }, [authLoading, user, router])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const username = String(formData.get('username') || '')
    const password = String(formData.get('password') || '')

    try {
      await login(username, password)
      router.replace('/admin')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('用户名或密码错误')
        } else if (err.status === 429) {
          setError('登录尝试过于频繁，请稍后再试')
        } else if (err.status === 0) {
          setError('无法连接服务器，请检查后端是否启动')
        } else {
          setError(err.message || '登录失败')
        }
      } else {
        setError('未知错误，请重试')
      }
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
          <p className="text-sm text-gray-500">管理后台登录</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
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

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

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

        <p className="text-center text-xs text-gray-600 mt-6">仅限授权人员访问</p>
      </motion.div>
    </main>
  )
}
