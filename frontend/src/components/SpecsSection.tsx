'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import {
  Cpu,
  Monitor,
  Lightbulb,
  Fan,
  Volume2,
  RotateCcw,
  Radio,
  CloudFog,
  HardDrive,
  Download,
  Plug,
} from 'lucide-react'

// ─── Spec Data ───────────────────────────────────────────────────────────────

const specs = [
  {
    id: 'mcu',
    category: '主控',
    value: 'ESP32-S3 双核 240MHz, 16MB Flash, 8MB PSRAM',
    icon: Cpu,
    // Position on exploded view (percentage from top-left)
    position: { top: '18%', left: '45%' },
  },
  {
    id: 'display',
    category: '显示',
    value: 'GC9A01 1.28" 圆形 IPS LCD, 240×240, SPI 40MHz',
    icon: Monitor,
    position: { top: '12%', left: '55%' },
  },
  {
    id: 'led',
    category: '灯带',
    value: 'WS2812B × 13颗（主灯带10 + 尾灯3），四区独立控制',
    icon: Lightbulb,
    position: { top: '35%', left: '25%' },
  },
  {
    id: 'fan',
    category: '风扇',
    value: 'PWM 无级调速, 1000Hz, 10-bit 分辨率',
    icon: Fan,
    position: { top: '50%', left: '50%' },
  },
  {
    id: 'audio',
    category: '音频',
    value: 'I2S DAC, 16-bit 44.1kHz, 5层实时混音',
    icon: Volume2,
    position: { top: '62%', left: '30%' },
  },
  {
    id: 'encoder',
    category: '交互',
    value: 'EC11 旋转编码器（PCNT四倍频），支持单击/双击/三击/长按',
    icon: RotateCcw,
    position: { top: '28%', left: '72%' },
  },
  {
    id: 'comm',
    category: '通信',
    value: 'BLE 5.0（控制通道）+ WiFi 2.4GHz（音频通道）',
    icon: Radio,
    position: { top: '42%', left: '70%' },
  },
  {
    id: 'fog',
    category: '雾化器',
    value: 'GPIO 开关控制',
    icon: CloudFog,
    position: { top: '72%', left: '55%' },
  },
  {
    id: 'storage',
    category: '存储',
    value: 'NVS + LittleFS, 支持3个自定义Logo槽位',
    icon: HardDrive,
    position: { top: '22%', left: '35%' },
  },
  {
    id: 'ota',
    category: '升级',
    value: 'OTA 空中升级, 双分区 + Rollback 保护',
    icon: Download,
    position: { top: '80%', left: '40%' },
  },
  {
    id: 'power',
    category: '供电',
    value: 'USB-C / DC 12V（待确认）',
    icon: Plug,
    position: { top: '85%', left: '60%' },
  },
]

const packageList = ['Critical 主机 × 1', '电源适配器 × 1', '快速入门指南 × 1']

// ─── Exploded View Component ─────────────────────────────────────────────────

function ExplodedView({ hoveredId }: { hoveredId: string | null }) {
  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto">
      {/* Central product silhouette */}
      <div className="absolute inset-[15%] rounded-2xl bg-dark-700/50 border border-white/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-primary/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <p className="text-[11px] text-gray-500">产品爆炸图</p>
          <p className="text-[10px] text-gray-600">替换为实际 3D 渲染</p>
        </div>
      </div>

      {/* Component markers */}
      {specs.map((spec) => {
        const isActive = hoveredId === spec.id
        const Icon = spec.icon
        return (
          <motion.div
            key={spec.id}
            className={`absolute z-10 transition-all duration-300 ${
              isActive ? 'scale-125' : hoveredId ? 'opacity-40' : ''
            }`}
            style={{ top: spec.position.top, left: spec.position.left }}
            animate={isActive ? { scale: 1.3 } : { scale: 1 }}
          >
            {/* Dot + pulse */}
            <div className="relative">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-primary/30 border-2 border-primary shadow-[0_0_12px_rgba(0,212,255,0.5)]'
                    : 'bg-dark-600/80 border border-white/20'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
              </div>
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              )}
            </div>
            {/* Label on hover */}
            {isActive && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap px-2 py-0.5 rounded bg-primary/90 text-[9px] text-dark-900 font-medium"
              >
                {spec.category}
              </motion.div>
            )}
          </motion.div>
        )
      })}

      {/* Decorative rings */}
      <div className="absolute inset-[10%] rounded-full border border-white/[0.03]" />
      <div className="absolute inset-[5%] rounded-full border border-white/[0.02]" />
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SpecsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <section id="specs" className="relative py-24 lg:py-32" ref={ref}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            硬件<span className="text-gradient">规格</span>
          </h2>
          <p className="text-gray-400 text-lg">专业级硬件配置，为极致体验而生</p>
        </motion.div>

        {/* Two-column layout: Exploded view + Spec table */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Exploded view (desktop only) */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block sticky top-24"
          >
            <ExplodedView hoveredId={hoveredId} />
          </motion.div>

          {/* Right: Spec table */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="rounded-2xl border border-white/5 overflow-hidden bg-dark-800/40 backdrop-blur-sm">
              {/* Table header */}
              <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] px-5 py-3 bg-dark-700/50 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  类别
                </span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  参数
                </span>
              </div>

              {/* Table rows */}
              {specs.map((spec, i) => {
                const Icon = spec.icon
                const isActive = hoveredId === spec.id
                return (
                  <motion.div
                    key={spec.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.04 }}
                    onMouseEnter={() => setHoveredId(spec.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] px-5 py-3.5 border-b border-white/[0.03] transition-all duration-200 cursor-default ${
                      isActive
                        ? 'bg-primary/[0.06] border-l-2 border-l-primary'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Category */}
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-primary' : 'text-gray-500'
                        }`}
                      />
                      <span
                        className={`text-sm font-medium transition-colors ${
                          isActive ? 'text-primary' : 'text-gray-300'
                        }`}
                      >
                        {spec.category}
                      </span>
                    </div>
                    {/* Value */}
                    <span
                      className={`text-sm font-mono leading-relaxed transition-colors ${
                        isActive ? 'text-white' : 'text-gray-400'
                      }`}
                    >
                      {spec.value}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* Package list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mt-8 p-5 rounded-2xl border border-white/5 bg-dark-800/30"
            >
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                包装清单
              </h3>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {packageList.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-primary/60 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm text-gray-400">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/[0.02] rounded-full blur-3xl pointer-events-none" />
    </section>
  )
}
