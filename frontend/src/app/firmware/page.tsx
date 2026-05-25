'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Download, Tag, Calendar, ExternalLink } from 'lucide-react'

interface Release {
  id: number
  tag_name: string
  name: string
  published_at: string
  body: string
  html_url: string
  assets: { name: string; browser_download_url: string; size: number }[]
}

const GITHUB_REPO = 'SunnyKlara/Zcritical'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function parseBody(body: string) {
  return body
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => line.replace(/^\*\s*/, '• ').replace(/\*\*(.*?)\*\*/g, '$1'))
}

export default function FirmwarePage() {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('无法获取版本信息')
        return res.json()
      })
      .then((data) => {
        setReleases(data)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return (
    <main id="main-content" className="relative">
      <Navbar />

      <section className="pt-32 pb-24 lg:pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              固件<span className="text-gradient">更新日志</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              查看 Critical 固件历史版本，下载固件进行手动升级。推荐通过 APP OTA 自动升级。
            </p>
          </motion.div>

          {loading && (
            <div className="text-center py-20" role="status" aria-live="polite">
              <div
                className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"
                aria-hidden
              />
              <p className="text-gray-500">正在从 GitHub 获取版本信息...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <p className="text-red-400 mb-4">{error}</p>
              <a
                href={`https://github.com/${GITHUB_REPO}/releases`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost inline-flex"
              >
                前往 GitHub 查看
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              {releases.map((release, i) => (
                <motion.article
                  key={release.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="glass-card p-6"
                >
                  <header className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Tag className="w-4 h-4" />
                      <span className="font-mono font-bold text-lg">{release.tag_name}</span>
                    </div>
                    {i === 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/30">
                        最新版本
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 ml-auto">
                      <Calendar className="w-3.5 h-3.5" />
                      <time dateTime={release.published_at}>
                        {formatDate(release.published_at)}
                      </time>
                    </div>
                  </header>

                  {release.name && release.name !== release.tag_name && (
                    <h3 className="font-medium text-white mb-3">{release.name}</h3>
                  )}

                  {release.body && (
                    <div className="mb-4 space-y-1">
                      {parseBody(release.body).map((line, j) => (
                        <p key={j} className="text-sm text-gray-400 leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  )}

                  {release.assets.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                      {release.assets.map((asset) => (
                        <a
                          key={asset.name}
                          href={asset.browser_download_url}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{asset.name}</span>
                          <span className="text-xs text-gray-500">({formatSize(asset.size)})</span>
                        </a>
                      ))}
                    </div>
                  )}
                </motion.article>
              ))}

              {releases.length === 0 && (
                <div className="text-center py-12 text-gray-500">暂无发布版本</div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
