'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Download, Smartphone, AlertCircle, ChevronDown, ExternalLink } from 'lucide-react'

const APK_URL = 'https://sunnyklara.com/releases/zcritical-t1-v1.4.0-arm64-v8a.apk'
const APK_FALLBACK =
  'https://github.com/SunnyKlara/Zcritical/releases/download/v1.4.0/zcritical-t1-v1.4.0-arm64-v8a.apk'
// 用户从 App Store Connect 开公开链接后替换此占位
const TESTFLIGHT_URL = 'https://testflight.apple.com/join/gADBqu9p'
const VERSION = 'v1.4.0'
const DOWNLOAD_PAGE_URL = 'https://zcritical.co/download'

type Platform = 'android' | 'ios' | 'other'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'other'
}

export function DownloadClient() {
  const [platform, setPlatform] = useState<Platform>('other')
  const [faqOpen, setFaqOpen] = useState(false)

  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6">
      {/* Smart banner */}
      {platform === 'android' && (
        <div className="mb-8 p-4 rounded-xl bg-primary/10 border border-primary/30 text-sm text-primary flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          检测到您使用 Android 设备，点击下方按钮直接下载安装
        </div>
      )}
      {platform === 'ios' && (
        <div className="mb-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-400 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          检测到您使用 iOS 设备，通过 TestFlight 安装全功能版本
        </div>
      )}

      {/* QR Code */}
      <div className="flex flex-col items-center mb-12">
        <div className="p-3 bg-white rounded-2xl shadow-lg shadow-primary/20 mb-4">
          <Image
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(DOWNLOAD_PAGE_URL)}&margin=4`}
            alt="扫码下载 Critical App"
            width={180}
            height={180}
            unoptimized
          />
        </div>
        <p className="text-sm text-gray-400">
          扫码或访问 <span className="text-primary font-mono">zcritical.co/download</span>
        </p>
        <p className="text-xs text-gray-600 mt-1">此地址已印于包装盒，长期有效</p>
      </div>

      {/* Platform cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {/* Android */}
        <div
          className={`glass-card p-6 flex flex-col ${platform === 'android' ? 'ring-1 ring-primary/50' : ''}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Android</p>
              <p className="text-xs text-gray-500 font-mono">{VERSION} · arm64</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-5 flex-1">
            Android 8.0+ · APK 直接安装，无需应用商店
          </p>
          <a
            href={APK_URL}
            className="btn-primary text-sm py-2.5 text-center flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            立即下载 APK
          </a>
        </div>

        {/* iOS */}
        <div
          className={`glass-card p-6 flex flex-col ${platform === 'ios' ? 'ring-1 ring-blue-500/50' : ''}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-white">iOS</p>
              <p className="text-xs text-gray-500 font-mono">{VERSION} · TestFlight</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-5 flex-1">
            iOS 14.0+ · 通过 Apple TestFlight 安装，功能与正式版完全相同
          </p>
          <a
            href={TESTFLIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm py-2.5 text-center flex items-center justify-center gap-2 rounded-button border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            加入 TestFlight
          </a>
        </div>
      </div>

      {/* 装不上怎么办 */}
      <div className="glass-card overflow-hidden mb-10">
        <button
          onClick={() => setFaqOpen(!faqOpen)}
          className="w-full flex items-center justify-between p-5 text-sm font-medium hover:bg-white/[0.02] transition-colors"
          aria-expanded={faqOpen}
        >
          <span className="flex items-center gap-2 text-gray-300">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            装不上？看这里
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${faqOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {faqOpen && (
          <div className="px-5 pb-5 text-sm text-gray-400 space-y-4 border-t border-white/5">
            <div className="pt-4">
              <p className="text-white font-medium mb-1">Android 提示「未知来源」</p>
              <p>
                安装时选择「仍然安装」，或前往「设置 → 安全 → 允许安装未知应用」授权后重新安装。
              </p>
            </div>
            <div>
              <p className="text-white font-medium mb-1">iOS 需要先安装 TestFlight</p>
              <p>
                点击「加入 TestFlight」后，若提示需要 TestFlight，先从 App Store 免费安装
                TestFlight，再回来点一次链接即可自动加入。
              </p>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Android 下载速度慢</p>
              <p>
                请切换 WiFi 后重试，或使用{' '}
                <a href={APK_FALLBACK} className="text-primary hover:underline">
                  备用下载链接（GitHub）
                </a>
                。
              </p>
            </div>
            <div>
              <p className="text-white font-medium mb-1">其他问题</p>
              <p>
                发邮件至{' '}
                <a href="mailto:support@zcritical.co" className="text-primary hover:underline">
                  support@zcritical.co
                </a>
                ，24 小时内回复。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
