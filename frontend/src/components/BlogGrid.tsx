'use client'

import { motion } from 'framer-motion'
import { Calendar, ArrowRight, Tag } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  excerpt: string
  date: string
  category: '发布' | '教程' | '案例'
}

const categoryColors: Record<string, string> = {
  发布: 'bg-primary/10 text-primary border-primary/30',
  教程: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  案例: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
}

export default function BlogGrid({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {posts.map((post, i) => (
        <motion.article
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className="glass-card p-6 flex flex-col group cursor-pointer"
        >
          <div className="aspect-[16/9] rounded-xl bg-dark-700/50 border border-white/5 mb-4 flex items-center justify-center overflow-hidden">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag className="w-5 h-5 text-primary/60" />
              </div>
              <p className="text-[10px] text-gray-600">封面图</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <span
              className={`px-2 py-0.5 text-[10px] rounded-full border ${categoryColors[post.category]}`}
            >
              {post.category}
            </span>
            <time className="flex items-center gap-1 text-xs text-gray-500" dateTime={post.date}>
              <Calendar className="w-3 h-3" />
              {post.date}
            </time>
          </div>

          <h2 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">
            {post.title}
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed flex-1">{post.excerpt}</p>

          <div className="mt-4 flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            阅读全文
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </motion.article>
      ))}
    </div>
  )
}
