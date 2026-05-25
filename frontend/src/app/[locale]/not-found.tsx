import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'

export const metadata = {
  title: '页面未找到',
  description: '您访问的页面不存在或已被移除',
}

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-dark-900">
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <h1 className="text-[10rem] sm:text-[12rem] font-bold leading-none text-gradient">404</h1>
          <div
            className="absolute inset-0 text-[10rem] sm:text-[12rem] font-bold leading-none text-accent/20 blur-sm animate-pulse"
            aria-hidden
          >
            404
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-3">页面飞走了</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          您访问的页面不存在，或已被移到其他位置。
          <br />
          先回首页看看？
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-button bg-primary text-dark-900 font-semibold text-sm transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-button border border-white/20 text-white font-medium text-sm transition-all hover:border-primary/50 hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            查看帮助
          </Link>
        </div>
      </div>
    </main>
  )
}
