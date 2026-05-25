import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Download, Smartphone, Cpu, FileText, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: '下载中心',
  description: '获取 Critical APP、固件和使用文档',
}

const APK_URL =
  'https://github.com/SunnyKlara/Zcritical/releases/download/v1.0.0/ridewind-v1.0.0.apk'

const appDownloads = [
  {
    platform: 'Android APK',
    version: 'v1.0.0',
    desc: '直接下载安装包，适用于 Android 8.0+',
    url: APK_URL,
    available: true,
  },
  {
    platform: 'Google Play',
    version: '即将上架',
    desc: 'Google Play 商店版本，审核中',
    url: '#',
    available: false,
  },
  {
    platform: 'App Store',
    version: '即将上架',
    desc: 'iOS 版本，审核中',
    url: '#',
    available: false,
  },
]

const firmwareDownloads = [
  {
    version: 'v1.0.0',
    date: '2025-01-15',
    desc: '首个正式版本',
    url: 'https://github.com/SunnyKlara/Zcritical/releases/tag/v1.0.0',
  },
]

const documents = [
  {
    title: '快速入门指南',
    desc: '开箱到首次使用的完整流程',
    format: 'PDF',
    url: '#',
    available: false,
  },
  {
    title: '产品使用说明书',
    desc: '详细功能说明与操作指南',
    format: 'PDF',
    url: '#',
    available: false,
  },
  {
    title: '固件手动刷写教程',
    desc: '使用 esptool 进行固件刷写',
    format: 'PDF',
    url: '#',
    available: false,
  },
]

export default function DownloadPage() {
  return (
    <main id="main-content" className="relative">
      <Navbar />

      <section className="pt-32 pb-24 lg:pb-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="text-center mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              下载<span className="text-gradient">中心</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              获取 Critical APP、固件和使用文档
            </p>
          </header>

          {/* APP Downloads */}
          <section className="mb-12" aria-labelledby="app-section">
            <h2 id="app-section" className="text-xl font-bold mb-6 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Critical APP
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {appDownloads.map((item) => (
                <div
                  key={item.platform}
                  className={`glass-card p-5 flex flex-col ${!item.available ? 'opacity-60' : ''}`}
                >
                  <div className="mb-3">
                    <p className="font-medium text-white text-sm">{item.platform}</p>
                    <p className="text-xs text-gray-500 font-mono">{item.version}</p>
                  </div>
                  <p className="text-xs text-gray-400 mb-4 flex-1">{item.desc}</p>
                  {item.available ? (
                    <a href={item.url} className="btn-primary text-xs py-2 text-center">
                      <Download className="w-3.5 h-3.5" />
                      下载
                    </a>
                  ) : (
                    <div className="text-center py-2 text-xs text-gray-500 border border-white/10 rounded-button">
                      即将上架
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Firmware Downloads */}
          <section className="mb-12" aria-labelledby="firmware-section">
            <h2 id="firmware-section" className="text-xl font-bold mb-6 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              固件版本
            </h2>
            <div className="glass-card overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_1fr_80px] sm:grid-cols-[120px_100px_1fr_100px] px-5 py-3 bg-dark-700/50 border-b border-white/5 text-xs text-gray-500 font-medium">
                <span>版本</span>
                <span>日期</span>
                <span>说明</span>
                <span className="text-right">操作</span>
              </div>
              {firmwareDownloads.map((fw) => (
                <div
                  key={fw.version}
                  className="grid grid-cols-[1fr_100px_1fr_80px] sm:grid-cols-[120px_100px_1fr_100px] px-5 py-3.5 border-b border-white/[0.03] items-center hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-mono text-sm text-primary">{fw.version}</span>
                  <span className="text-xs text-gray-500">{fw.date}</span>
                  <span className="text-sm text-gray-400">{fw.desc}</span>
                  <a
                    href={fw.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-right text-xs text-primary hover:underline inline-flex items-center gap-1 justify-end"
                  >
                    查看
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">
              更多历史版本请查看{' '}
              <a href="/firmware" className="text-primary hover:underline">
                固件更新日志
              </a>
            </p>
          </section>

          {/* Documents */}
          <section aria-labelledby="docs-section">
            <h2 id="docs-section" className="text-xl font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              使用文档
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.title}
                  className={`glass-card p-5 ${!doc.available ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 font-mono">{doc.format}</span>
                  </div>
                  <h3 className="font-medium text-white text-sm mb-1">{doc.title}</h3>
                  <p className="text-xs text-gray-400 mb-4">{doc.desc}</p>
                  {doc.available ? (
                    <a href={doc.url} className="text-xs text-primary hover:underline">
                      下载文档
                    </a>
                  ) : (
                    <span className="text-xs text-gray-600">即将提供</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <Footer />
    </main>
  )
}
