'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { captureException } from '@/lib/sentry'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    void captureException(error)
    console.error('Page error:', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-dark-900">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-accent" />
        </div>

        <h1 className="text-3xl font-bold mb-3">出错了</h1>
        <p className="text-gray-400 mb-2 leading-relaxed">页面遇到了一个错误，工程师已收到通知。</p>
        {error.digest && (
          <p className="text-xs text-gray-600 font-mono mb-8">错误编号：{error.digest}</p>
        )}

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-button bg-primary text-dark-900 font-semibold text-sm transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]"
          >
            <RotateCcw className="w-4 h-4" />
            重试
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-button border border-white/20 text-white font-medium text-sm transition-all hover:border-primary/50 hover:text-primary"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
        </div>
      </div>
    </main>
  )
}
