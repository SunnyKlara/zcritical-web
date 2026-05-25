'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const useCases = [
  {
    title: '骑行训练',
    desc: '配合智能骑行台，风速随功率实时变化，让室内训练不再枯燥，感受真实的骑行阻力与速度感。',
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    gradient: 'from-blue-500/20 to-primary/20',
  },
  {
    title: '展厅展示',
    desc: '为自行车品牌展厅、体验店打造沉浸式产品展示方案，四维感官联动吸引客户驻足体验。',
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    title: '内容创作',
    desc: '为骑行类 YouTuber、直播主播提供专业级视觉效果，灯效+雾化+风声打造电影级画面质感。',
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
    gradient: 'from-orange-500/20 to-red-500/20',
  },
]

export default function UseCasesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="usecases" className="relative py-24 lg:py-32" ref={ref}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            使用<span className="text-gradient">场景</span>
          </h2>
          <p className="text-gray-400 text-lg">多场景适配，释放无限可能</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.map((useCase, i) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
              className="glass-card p-8 text-center hover:border-primary/30 transition-all group relative overflow-hidden"
            >
              {/* Background gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}
              />

              <div className="relative z-10">
                {/* Scene image placeholder */}
                <div className="w-full aspect-[4/3] rounded-xl bg-dark-800/80 border border-white/5 mb-6 flex items-center justify-center overflow-hidden">
                  <div className="text-center">
                    <div className="text-primary/60 mb-2 flex justify-center">{useCase.icon}</div>
                    <p className="text-gray-600 text-xs">场景图片</p>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-3">{useCase.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{useCase.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
