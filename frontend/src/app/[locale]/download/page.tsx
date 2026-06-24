import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Cpu, FileText, ExternalLink } from 'lucide-react'
import { DownloadClient } from './_client'

export const metadata: Metadata = {
  title: '下载中心',
  description: '获取 Critical APP、固件和使用文档。Android 直接下载，iOS 通过 TestFlight 安装。',
}

const firmwareDownloads = [
  {
    version: 'v1.2.0',
    date: '2026-06-14',
    desc: '当前发布固件，支持 OTA 升级',
    url: 'https://github.com/SunnyKlara/Zcritical/releases',
  },
]

const documents = [
  {
    title: '新手教程',
    desc: '开箱到首次使用的完整图文指南',
    format: 'WEB',
    url: '/guide',
    available: true,
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
              下载 <span className="text-gradient">Critical APP</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              连接并控制您的设备 · Android 直接安装 · iOS 通过 TestFlight
            </p>
          </header>

          {/* APP 下载（含 UA 检测 + 二维码 + FAQ） */}
          <DownloadClient />

          {/* 固件版本 */}
          <section className="mb-12 max-w-2xl mx-auto" aria-labelledby="firmware-section">
            <h2 id="firmware-section" className="text-xl font-bold mb-6 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              固件版本
            </h2>
            <div className="glass-card overflow-hidden">
              {firmwareDownloads.map((fw) => (
                <div
                  key={fw.version}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div>
                    <span className="font-mono text-sm text-primary">{fw.version}</span>
                    <span className="text-xs text-gray-500 ml-3">{fw.date}</span>
                    <p className="text-sm text-gray-400 mt-1">{fw.desc}</p>
                  </div>
                  <a
                    href={fw.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    查看
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">
              固件通过 App 内 OTA 自动推送，无需手动下载。更多版本见{' '}
              <a href="/firmware" className="text-primary hover:underline">
                固件更新日志
              </a>
            </p>
          </section>

          {/* 使用文档 */}
          <section className="max-w-2xl mx-auto" aria-labelledby="docs-section">
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
                      查看
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
