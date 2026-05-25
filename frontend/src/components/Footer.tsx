'use client'

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">C</span>
              </div>
              <span className="text-xl font-bold tracking-wider">CRITICAL</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              沉浸式骑行模拟体验设备
              <br />风 · 光 · 声 · 雾，四维感官沉浸
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-dark-700 border border-white/5 flex items-center justify-center hover:border-primary/30 hover:text-primary transition-all text-gray-400"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-dark-700 border border-white/5 flex items-center justify-center hover:border-primary/30 hover:text-primary transition-all text-gray-400"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-dark-700 border border-white/5 flex items-center justify-center hover:border-primary/30 hover:text-primary transition-all text-gray-400"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">产品</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="#overview"
                  className="text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  产品概览
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  核心功能
                </a>
              </li>
              <li>
                <a
                  href="#specs"
                  className="text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  硬件规格
                </a>
              </li>
              <li>
                <a
                  href="#usecases"
                  className="text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  使用场景
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">下载</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="/download"
                  className="text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  下载中心
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/SunnyKlara/Zcritical/releases/download/v1.0.0/ridewind-v1.0.0.apk"
                  className="text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  APK 直链下载
                </a>
              </li>
              <li>
                <a
                  href="/firmware"
                  className="text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  固件更新日志
                </a>
              </li>
              <li>
                <a
                  href="/support"
                  className="text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  使用帮助
                </a>
              </li>
              <li>
                <a
                  href="/blog"
                  className="text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  产品动态
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">联系我们</h4>
            <ul className="space-y-2.5">
              <li className="text-sm text-gray-400">
                <span className="text-gray-500">邮箱：</span>
                <a
                  href="mailto:support@critical.com"
                  className="hover:text-primary transition-colors"
                >
                  support@critical.com
                </a>
              </li>
              <li className="text-sm text-gray-400">
                <span className="text-gray-500">微信：</span>
                Critical_Official
              </li>
              <li className="text-sm text-gray-400">
                <span className="text-gray-500">客服：</span>
                周一至周五 9:00-18:00
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">© 2026 Critical. All rights reserved.</p>
          <div className="flex gap-6">
            <a
              href="/privacy"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              隐私政策
            </a>
            <a
              href="/terms"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              用户协议
            </a>
            <a
              href="/support"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              保修条款
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
