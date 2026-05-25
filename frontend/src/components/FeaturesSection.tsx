'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  Wind,
  Lightbulb,
  Volume2,
  Wifi,
  CloudFog,
  Circle,
  Smartphone,
  Download,
} from 'lucide-react'

// ─── Sub-components for each feature animation ───────────────────────────────

/** 1. 风速仪表盘 */
function WindGauge() {
  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* Dial background */}
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="6"
          strokeDasharray="207"
          strokeDashoffset="207"
          strokeLinecap="round"
          transform="rotate(-135 50 50)"
          className="animate-gauge-fill"
        />
        {/* Needle */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="16"
          stroke="#00D4FF"
          strokeWidth="2"
          strokeLinecap="round"
          className="origin-center animate-needle-sweep"
        />
        <circle cx="50" cy="50" r="4" fill="#00D4FF" />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#FF3B30" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-400">
        <span className="animate-speed-count font-mono text-primary">340</span> km/h
      </div>
    </div>
  )
}

/** 2. LED 灯效循环 */
function LedStrip() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-8 rounded-full animate-led-cycle"
            style={{
              animationDelay: `${i * 0.15}s`,
              backgroundColor: `hsl(${(i * 360) / 14}, 90%, 55%)`,
            }}
          />
        ))}
      </div>
      <div className="h-1 w-full max-w-[180px] rounded-full overflow-hidden bg-dark-600">
        <div className="h-full w-full animate-led-chase bg-gradient-to-r from-primary via-purple-500 to-red-500" />
      </div>
    </div>
  )
}

/** 3. 音频波形 */
function AudioWaveform() {
  return (
    <div className="flex items-end justify-center gap-[3px] h-20">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 bg-primary/80 rounded-full animate-waveform"
          style={{
            animationDelay: `${i * 0.08}s`,
            height: '8px',
          }}
        />
      ))}
    </div>
  )
}

/** 4. WiFi 投射连线 */
function WifiCast() {
  return (
    <div className="flex items-center justify-center gap-2">
      {/* Phone */}
      <div className="w-8 h-14 rounded-lg border-2 border-white/30 flex items-center justify-center">
        <div className="w-4 h-6 rounded-sm bg-primary/30" />
      </div>
      {/* Signal dots */}
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-wifi-dot"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>
      {/* Speaker */}
      <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center">
        <Volume2 className="w-5 h-5 text-primary animate-pulse" />
      </div>
    </div>
  )
}

/** 5. 雾气粒子 */
function FogParticles() {
  return (
    <div className="relative w-full h-24 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/10 animate-fog-particle"
          style={{
            width: `${12 + Math.random() * 20}px`,
            height: `${12 + Math.random() * 20}px`,
            left: `${(i / 12) * 100}%`,
            bottom: `${Math.random() * 30}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  )
}

/** 6. 圆屏轮播 */
function RoundScreen() {
  const pages = ['风速', '灯效', '音效', '雾化', '设置', '关于']
  return (
    <div className="relative w-28 h-28 mx-auto rounded-full border-4 border-dark-600 overflow-hidden bg-dark-900">
      <div className="absolute inset-0 flex items-center justify-center animate-screen-carousel">
        {pages.map((p, i) => (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary"
            style={{
              animation: `screenPage 9s infinite`,
              animationDelay: `${i * 1.5}s`,
              opacity: 0,
            }}
          >
            {p}
          </div>
        ))}
      </div>
      {/* Ring glow */}
      <div className="absolute inset-0 rounded-full border border-primary/20" />
    </div>
  )
}

/** 7. APP 控制 */
function AppMockup() {
  return (
    <div className="relative w-20 h-36 mx-auto rounded-xl border-2 border-white/20 bg-dark-900 overflow-hidden">
      {/* Status bar */}
      <div className="h-3 bg-dark-700 flex items-center justify-center">
        <div className="w-6 h-1 rounded-full bg-white/20" />
      </div>
      {/* App content */}
      <div className="p-1.5 space-y-1.5">
        <div className="h-2 w-full rounded bg-primary/40 animate-pulse" />
        <div className="grid grid-cols-2 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-6 rounded bg-dark-600 animate-app-btn"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <div className="h-8 rounded bg-primary/20 animate-pulse" />
      </div>
      {/* BLE indicator */}
      <div className="absolute top-4 right-1 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
    </div>
  )
}

/** 8. OTA 升级 */
function OtaProgress() {
  return (
    <div className="space-y-3 w-full max-w-[180px] mx-auto">
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-dark-600 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400 animate-ota-progress" />
      </div>
      {/* Version */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>v2.1.0</span>
        <span className="text-primary animate-version-bump font-mono">v2.2.0</span>
      </div>
      {/* Status */}
      <div className="text-center text-xs text-gray-500 animate-pulse">升级中...</div>
    </div>
  )
}

// ─── Feature data ────────────────────────────────────────────────────────────

const features = [
  {
    icon: Wind,
    title: '无级风速',
    subtitle: '0-340km/h 模拟，PWM 无级调速',
    animation: <WindGauge />,
  },
  {
    icon: Lightbulb,
    title: '智能灯效',
    subtitle: '14色预设 + 8种油门联动灯效',
    animation: <LedStrip />,
  },
  {
    icon: Volume2,
    title: '引擎音效',
    subtitle: '5层16-bit实时合成，变速率交叉淡入',
    animation: <AudioWaveform />,
  },
  {
    icon: Wifi,
    title: '音频投射',
    subtitle: '手机音乐 WiFi 实时推流到硬件扬声器',
    animation: <WifiCast />,
  },
  {
    icon: CloudFog,
    title: '雾化氛围',
    subtitle: '一键开启，营造沉浸式骑行环境',
    animation: <FogParticles />,
  },
  {
    icon: Circle,
    title: '圆屏交互',
    subtitle: '240×240 高清圆屏，6页滑动菜单',
    animation: <RoundScreen />,
  },
  {
    icon: Smartphone,
    title: 'APP 控制',
    subtitle: '蓝牙连接，全功能实时控制',
    animation: <AppMockup />,
  },
  {
    icon: Download,
    title: '空中升级',
    subtitle: 'OTA 固件升级 + APP 自动更新',
    animation: <OtaProgress />,
  },
]

// ─── Feature Card ────────────────────────────────────────────────────────────

function FeatureCard({ feature, index }: { feature: (typeof features)[number]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(cardRef, { margin: '-50px' })
  const Icon = feature.icon

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative glass-card p-6 flex flex-col items-center text-center
                 transition-all duration-300 hover:scale-[1.04] hover:border-primary/40
                 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)]"
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-6 h-6 text-primary" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold mb-1">{feature.title}</h3>

      {/* Subtitle */}
      <p className="text-sm text-gray-400 mb-4 leading-relaxed">{feature.subtitle}</p>

      {/* Animation area - visible on hover (desktop) or always visible (mobile)
          Animations are paused when card is not in viewport for performance */}
      <div
        className={`w-full transition-all duration-300 overflow-hidden
          max-h-40 opacity-100 lg:max-h-0 lg:opacity-0 lg:group-hover:max-h-40 lg:group-hover:opacity-100
          ${isInView ? '[&_*]:running' : '[&_*]:paused'}`}
      >
        {feature.animation}
      </div>

      {/* Hover glow */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
    </motion.div>
  )
}

// ─── Main Section ────────────────────────────────────────────────────────────

export default function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="features" className="relative py-24 lg:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-gradient">8 大核心功能</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            全方位感官联动，打造极致沉浸骑行体验
          </p>
        </motion.div>

        {/* 2×4 Grid (desktop) / single column (mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/[0.02] rounded-full blur-3xl pointer-events-none" />
    </section>
  )
}
