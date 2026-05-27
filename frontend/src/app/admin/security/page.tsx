'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  ShieldOff,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Lock,
  Loader2,
} from 'lucide-react'
import { useAuth, type Setup2FAData } from '@/lib/auth-context'
import { ApiError } from '@/lib/api'

type Phase =
  | 'idle' // initial — show enable / disable buttons based on totpEnabled
  | 'setup-loading' // POST /2fa/setup in progress
  | 'setup-show-qr' // QR + secret displayed, user scanning
  | 'setup-recovery-codes' // verify-setup OK; display one-time recovery codes
  | 'disable-form' // collecting password + code to disable

export default function AdminSecurityPage() {
  const router = useRouter()
  const { user, loading, setupTotp, verifySetupTotp, disableTotp } = useAuth()

  const [phase, setPhase] = useState<Phase>('idle')
  const [setupData, setSetupData] = useState<Setup2FAData | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [error, setError] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/admin/login')
    }
  }, [loading, user, router])

  function mapError(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
      if (err.status === 401) return '密码或验证码错误'
      if (err.status === 409) return '当前 2FA 状态与操作不符，请刷新页面后重试'
      if (err.status === 0) return '无法连接服务器'
      return err.message || fallback
    }
    return fallback
  }

  // ─── Enable flow ─────────────────────────────────────────────────────────

  async function startEnable() {
    setError('')
    setPhase('setup-loading')
    try {
      const data = await setupTotp()
      setSetupData(data)
      setPhase('setup-show-qr')
    } catch (err) {
      setError(mapError(err, '无法开始 2FA 设置'))
      setPhase('idle')
    }
  }

  async function handleVerifySetup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const code = String(formData.get('code') || '').trim()
    try {
      const result = await verifySetupTotp(code)
      setRecoveryCodes(result.recoveryCodes)
      setSetupData(null)
      setPhase('setup-recovery-codes')
    } catch (err) {
      setError(mapError(err, '验证码不正确'))
    } finally {
      setSubmitting(false)
    }
  }

  function finishEnableFlow() {
    setRecoveryCodes([])
    setAcknowledged(false)
    setPhase('idle')
  }

  // ─── Disable flow ────────────────────────────────────────────────────────

  function startDisable() {
    setError('')
    setPhase('disable-form')
  }

  async function handleDisable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const password = String(formData.get('password') || '')
    const code = String(formData.get('code') || '').trim()
    try {
      await disableTotp({ password, code })
      setPhase('idle')
    } catch (err) {
      setError(mapError(err, '禁用失败'))
    } finally {
      setSubmitting(false)
    }
  }

  // ─── UI helpers ──────────────────────────────────────────────────────────

  function copyAllCodes() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(recoveryCodes.join('\n')).catch(() => {
        /* ignore */
      })
    }
  }

  function downloadCodes() {
    const blob = new Blob(
      [
        'Critical · Admin 2FA Recovery Codes\n' +
          'Generated: ' +
          new Date().toISOString() +
          '\n\n' +
          recoveryCodes.join('\n') +
          '\n\n' +
          'Each code can be used once. Keep them in a secure place.\n',
      ],
      { type: 'text/plain' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `critical-admin-recovery-codes-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Loading / unauthenticated ───────────────────────────────────────────

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  const totpEnabled = Boolean(user.totpEnabled)

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-dark-900">
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href="/admin"
            className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-bold tracking-wider">账户安全</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">2FA · TOTP</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* 2FA status card */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                totpEnabled
                  ? 'bg-green-500/15 border border-green-500/40'
                  : 'bg-amber-500/15 border border-amber-500/40'
              }`}
            >
              {totpEnabled ? (
                <ShieldCheck className="w-5 h-5 text-green-400" />
              ) : (
                <ShieldOff className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold mb-1">
                {totpEnabled ? '两步验证已启用' : '两步验证未启用'}
              </h2>
              <p className="text-sm text-gray-400">
                {totpEnabled
                  ? '您的账户已受到 TOTP 两步验证保护。每次登录除密码外还需输入身份验证器 App 显示的 6 位动态码。'
                  : '强烈建议启用两步验证。即便密码泄露，攻击者也无法登录您的管理员账户。'}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Action area — phase machine */}
        <AnimatePresence mode="wait">
          {/* Idle state — primary actions */}
          {phase === 'idle' && (
            <motion.section
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-6"
            >
              {!totpEnabled ? (
                <button onClick={startEnable} className="btn-primary w-full justify-center">
                  <ShieldCheck className="w-4 h-4" />
                  启用两步验证
                </button>
              ) : (
                <button
                  onClick={startDisable}
                  className="w-full px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400 hover:bg-red-500/15 transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldOff className="w-4 h-4" />
                  禁用两步验证
                </button>
              )}
              {error && (
                <div className="mt-4">
                  <ErrorBanner message={error} />
                </div>
              )}
            </motion.section>
          )}

          {phase === 'setup-loading' && (
            <motion.section
              key="setup-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card p-12 flex items-center justify-center"
            >
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </motion.section>
          )}

          {phase === 'setup-show-qr' && setupData && (
            <motion.section
              key="setup-show-qr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-6 space-y-5"
            >
              <div>
                <h3 className="text-base font-semibold mb-2">第 1 步 · 扫描二维码</h3>
                <p className="text-sm text-gray-400 mb-4">
                  使用 Google Authenticator、Microsoft Authenticator、Authy 或 1Password 等任何 TOTP
                  兼容 App 扫描下方二维码。
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <Image
                    src={setupData.qr}
                    alt="2FA QR code"
                    width={224}
                    height={224}
                    unoptimized
                    className="w-56 h-56"
                  />
                </div>
                <details className="w-full">
                  <summary className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer text-center">
                    无法扫描？显示密钥手动输入
                  </summary>
                  <div className="mt-2 p-3 rounded-lg bg-dark-800/50 border border-white/10">
                    <p className="text-[11px] text-gray-500 mb-1">密钥（Base32）</p>
                    <code className="text-xs font-mono text-primary break-all select-all">
                      {setupData.secret}
                    </code>
                  </div>
                </details>
              </div>

              <div className="border-t border-white/5 pt-5">
                <h3 className="text-base font-semibold mb-2">第 2 步 · 输入 App 显示的验证码</h3>
                <form onSubmit={handleVerifySetup} className="space-y-4">
                  <input
                    name="code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoFocus
                    disabled={submitting}
                    placeholder="000000"
                    className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-center text-2xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  />
                  {error && <ErrorBanner message={error} />}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSetupData(null)
                        setPhase('idle')
                        setError('')
                      }}
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-sm text-gray-300 hover:border-white/30 hover:text-white transition-colors disabled:opacity-50"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary flex-1 justify-center disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          验证并启用
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.section>
          )}

          {phase === 'setup-recovery-codes' && (
            <motion.section
              key="setup-recovery-codes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-6 space-y-5"
            >
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-100">
                  <p className="font-semibold mb-1">请立即保存以下恢复码</p>
                  <p className="text-xs text-amber-200/80">
                    每个恢复码只能使用一次。当您丢失身份验证设备时可使用恢复码登录。
                    <strong className="text-amber-100">这些码不会再次显示。</strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((code, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg bg-dark-800/70 border border-white/10 font-mono text-sm text-center tracking-wider select-all"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyAllCodes}
                  className="flex-1 px-3 py-2 rounded-lg border border-white/10 text-xs text-gray-300 hover:border-white/30 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  复制全部
                </button>
                <button
                  onClick={downloadCodes}
                  className="flex-1 px-3 py-2 rounded-lg border border-white/10 text-xs text-gray-300 hover:border-white/30 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  下载 .txt
                </button>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1"
                />
                <span>我已将这些恢复码安全存放（密码管理器、加密笔记或离线纸张）。</span>
              </label>

              <button
                disabled={!acknowledged}
                onClick={finishEnableFlow}
                className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                完成
              </button>
            </motion.section>
          )}

          {phase === 'disable-form' && (
            <motion.section
              key="disable-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-6 space-y-4"
            >
              <h3 className="text-base font-semibold mb-1">禁用两步验证</h3>
              <p className="text-sm text-gray-400 mb-4">
                禁用后您的账户将仅依赖密码保护。请输入当前密码与一组 TOTP 验证码确认。
              </p>

              <form onSubmit={handleDisable} className="space-y-4">
                <label className="block">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    当前密码
                  </span>
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    autoFocus
                    disabled={submitting}
                    className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  />
                </label>
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
                    disabled={submitting}
                    placeholder="000000"
                    className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-center text-2xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  />
                </label>
                {error && <ErrorBanner message={error} />}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhase('idle')
                      setError('')
                    }}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-sm text-gray-300 hover:border-white/30 hover:text-white transition-colors disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400 hover:bg-red-500/15 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldOff className="w-4 h-4" />
                        确认禁用
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
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
