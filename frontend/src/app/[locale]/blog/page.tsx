import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BlogGrid from '@/components/BlogGrid'

export const metadata: Metadata = {
  title: '产品动态',
  description: 'Critical 新功能发布、使用教程、用户案例',
}

interface BlogPost {
  id: string
  title: string
  excerpt: string
  date: string
  category: '发布' | '教程' | '案例'
}

const posts: BlogPost[] = [
  {
    id: 'v1-release',
    title: 'Critical v1.0.0 正式发布',
    excerpt:
      '经过数月的开发与测试，Critical 智能风洞模拟器 v1.0.0 正式发布。支持无级风速、14色灯效、引擎音效合成、雾化氛围等核心功能。',
    date: '2025-01-15',
    category: '发布',
  },
  {
    id: 'getting-started',
    title: '5 分钟快速上手 Critical',
    excerpt:
      '从开箱到首次骑行体验，本教程带你快速了解 Critical 的基本操作：蓝牙配对、风速设置、灯效选择和音效调节。',
    date: '2025-01-20',
    category: '教程',
  },
  {
    id: 'led-effects-guide',
    title: '灯效模式完全指南：8 种动态效果详解',
    excerpt:
      '深入了解 Critical 的 8 种灯效模式：转速条、脉冲、追逐、交替、波浪、闪电、风浪联动、舞台灯光秀。每种模式的适用场景和自定义技巧。',
    date: '2025-02-01',
    category: '教程',
  },
  {
    id: 'content-creator-case',
    title: '内容创作者如何使用 Critical 提升视频质感',
    excerpt:
      '骑行博主 @RideWithMe 分享了如何利用 Critical 的灯效和雾化功能，为室内骑行视频增添电影级氛围感。',
    date: '2025-02-10',
    category: '案例',
  },
]

export default function BlogPage() {
  return (
    <main id="main-content" className="relative">
      <Navbar />

      <section className="pt-32 pb-24 lg:pb-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="text-center mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              产品<span className="text-gradient">动态</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              新功能发布、使用教程、用户案例
            </p>
          </header>

          <BlogGrid posts={posts} />

          <p className="text-center mt-12 text-sm text-gray-600">更多内容持续更新中...</p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
