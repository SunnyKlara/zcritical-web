'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
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
// Static data (icons, positions). Translatable strings are pulled at render
// time via spec.categoryKey / valueKey.

type SpecRow = {
  id: string
  icon: typeof Cpu
  position: { top: string; left: string }
  categoryKey: string
  valueKey: string
}

const specs: SpecRow[] = [
  {
    id: 'mcu',
    icon: Cpu,
    position: { top: '18%', left: '45%' },
    categoryKey: 'mcuCategory',
    valueKey: 'mcuValue',
  },
  {
    id: 'display',
    icon: Monitor,
    position: { top: '12%', left: '55%' },
    categoryKey: 'displayCategory',
    valueKey: 'displayValue',
  },
  {
    id: 'led',
    icon: Lightbulb,
    position: { top: '35%', left: '25%' },
    categoryKey: 'ledCategory',
    valueKey: 'ledValue',
  },
  {
    id: 'fan',
    icon: Fan,
    position: { top: '50%', left: '50%' },
    categoryKey: 'fanCategory',
    valueKey: 'fanValue',
  },
  {
    id: 'audio',
    icon: Volume2,
    position: { top: '62%', left: '30%' },
    categoryKey: 'audioCategory',
    valueKey: 'audioValue',
  },
  {
    id: 'encoder',
    icon: RotateCcw,
    position: { top: '28%', left: '72%' },
    categoryKey: 'encoderCategory',
    valueKey: 'encoderValue',
  },
  {
    id: 'comm',
    icon: Radio,
    position: { top: '42%', left: '70%' },
    categoryKey: 'commCategory',
    valueKey: 'commValue',
  },
  {
    id: 'fog',
    icon: CloudFog,
    position: { top: '72%', left: '55%' },
    categoryKey: 'fogCategory',
    valueKey: 'fogValue',
  },
  {
    id: 'storage',
    icon: HardDrive,
    position: { top: '22%', left: '35%' },
    categoryKey: 'storageCategory',
    valueKey: 'storageValue',
  },
  {
    id: 'ota',
    icon: Download,
    position: { top: '80%', left: '40%' },
    categoryKey: 'otaCategory',
    valueKey: 'otaValue',
  },
  {
    id: 'power',
    icon: Plug,
    position: { top: '85%', left: '60%' },
    categoryKey: 'powerCategory',
    valueKey: 'powerValue',
  },
]

// ─── Exploded View Component ─────────────────────────────────────────────────

function ExplodedView({ hoveredId }: { hoveredId: string | null }) {
  const t = useTranslations('Specs')
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
          <p className="text-[11px] text-gray-500">{t('explodedLabel')}</p>
          <p className="text-[10px] text-gray-600">{t('explodedHint')}</p>
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
                {t(spec.categoryKey)}
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
  const t = useTranslations('Specs')

  const packageList = [t('packageItem1'), t('packageItem2'), t('packageItem3')]

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
            {t('title')}
            <span className="text-gradient">{t('titleHighlight')}</span>
          </h2>
          <p className="text-gray-400 text-lg">{t('subtitle')}</p>
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
                  {t('tableCategory')}
                </span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t('tableValue')}
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
                        {t(spec.categoryKey)}
                      </span>
                    </div>
                    {/* Value */}
                    <span
                      className={`text-sm font-mono leading-relaxed transition-colors ${
                        isActive ? 'text-white' : 'text-gray-400'
                      }`}
                    >
                      {t(spec.valueKey)}
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
                {t('packageTitle')}
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
