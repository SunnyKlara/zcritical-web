'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import {
  Bluetooth,
  Gauge,
  Palette,
  ImageIcon,
  Wifi,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ─── APP Screen Sub-components ───────────────────────────────────────────────
// Each mock content uses translations. Stable id keys identify each screen so
// the carousel + side annotations can map by id rather than index.

function ScanScreen() {
  const t = useTranslations('AppShowcase')
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-b from-dark-900 to-dark-800">
      <Bluetooth className="w-10 h-10 text-blue-400 mb-3 animate-pulse" />
      <p className="text-xs text-white font-medium mb-4">{t('scanScanning')}</p>
      <div className="w-full space-y-2">
        {['Critical-A1B2', 'Critical-C3D4'].map((name) => (
          <div
            key={name}
            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-gray-300 flex-1">{name}</span>
            <span className="text-[9px] text-primary px-1.5 py-0.5 rounded bg-primary/10">
              {t('scanConnect')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RunningScreen() {
  const t = useTranslations('AppShowcase')
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-b from-dark-900 to-dark-800">
      {/* Speed gauge */}
      <div className="relative w-24 h-24 mb-3">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
            strokeDasharray="188"
            strokeDashoffset="63"
            transform="rotate(135 50 50)"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#00D4FF"
            strokeWidth="8"
            strokeDasharray="188"
            strokeDashoffset="120"
            strokeLinecap="round"
            transform="rotate(135 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">128</span>
          <span className="text-[8px] text-gray-400">km/h</span>
        </div>
      </div>
      {/* Throttle slider */}
      <div className="w-full px-2">
        <div className="h-2 rounded-full bg-dark-600 overflow-hidden">
          <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-primary to-blue-400" />
        </div>
        <p className="text-[9px] text-gray-500 text-center mt-1">{t('runningThrottle')}</p>
      </div>
    </div>
  )
}

function ColorizeScreen() {
  const t = useTranslations('AppShowcase')
  return (
    <div className="flex flex-col items-center justify-center h-full p-3 bg-gradient-to-b from-dark-900 to-dark-800">
      {/* Color presets */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {[
          '#FF3B30',
          '#FF9500',
          '#FFCC00',
          '#34C759',
          '#00D4FF',
          '#5856D6',
          '#AF52DE',
          '#FF2D55',
          '#5AC8FA',
          '#4CD964',
          '#FF6B6B',
          '#48DBFB',
          '#FECA57',
          '#00D2D3',
        ].map((c) => (
          <div
            key={c}
            className="w-4 h-4 rounded-full border border-white/20"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      {/* RGB circle */}
      <div className="w-16 h-16 rounded-full bg-gradient-conic from-red-500 via-green-500 via-blue-500 to-red-500 border-2 border-white/20 relative">
        <div className="absolute inset-2 rounded-full bg-dark-900" />
      </div>
      <p className="text-[9px] text-gray-500 mt-2">{t('colorizePalette')}</p>
    </div>
  )
}

function LogoScreen() {
  const t = useTranslations('AppShowcase')
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-b from-dark-900 to-dark-800">
      {/* Round screen preview */}
      <div className="w-20 h-20 rounded-full border-2 border-white/20 bg-dark-700 flex items-center justify-center mb-3 overflow-hidden">
        <div className="text-center">
          <ImageIcon className="w-6 h-6 text-amber-400 mx-auto mb-1" />
          <p className="text-[8px] text-gray-400">{t('logoPreview')}</p>
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex gap-2">
        <div className="px-2 py-1 rounded bg-primary/10 border border-primary/30">
          <span className="text-[9px] text-primary">{t('logoCamera')}</span>
        </div>
        <div className="px-2 py-1 rounded bg-primary/10 border border-primary/30">
          <span className="text-[9px] text-primary">{t('logoGallery')}</span>
        </div>
      </div>
    </div>
  )
}

function WifiAudioScreen() {
  const t = useTranslations('AppShowcase')
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-b from-dark-900 to-dark-800">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-600/30 border border-green-500/30 flex items-center justify-center mb-3">
        <span className="text-2xl">🎵</span>
      </div>
      <p className="text-[10px] text-white font-medium">{t('wifiAudioPlaying')}</p>
      <p className="text-[9px] text-gray-400 mb-3">Highway Star — Deep Purple</p>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/30">
        <Wifi className="w-3 h-3 text-green-400" />
        <span className="text-[9px] text-green-400">{t('wifiAudioConnected')}</span>
      </div>
    </div>
  )
}

function OtaScreen() {
  const t = useTranslations('AppShowcase')
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-b from-dark-900 to-dark-800">
      <Download className="w-8 h-8 text-indigo-400 mb-3" />
      <p className="text-[10px] text-white font-medium mb-1">{t('otaName')}</p>
      <p className="text-[9px] text-gray-400 mb-3">v2.1.0 → v2.2.0</p>
      <div className="w-full">
        <div className="h-1.5 rounded-full bg-dark-600 overflow-hidden mb-1">
          <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-indigo-500 to-primary" />
        </div>
        <div className="flex justify-between text-[8px] text-gray-500">
          <span>72%</span>
          <span>{t('otaRemaining')}</span>
        </div>
      </div>
    </div>
  )
}

// ─── APP Screen Data ─────────────────────────────────────────────────────────

type AppScreen = {
  id: string
  titleKey: string
  descKey: string
  icon: typeof Bluetooth
  color: string
  render: () => ReactNode
}

const appScreens: AppScreen[] = [
  {
    id: 'scan',
    titleKey: 'scanTitle',
    descKey: 'scanDesc',
    icon: Bluetooth,
    color: '#3B82F6',
    render: () => <ScanScreen />,
  },
  {
    id: 'running',
    titleKey: 'runningTitle',
    descKey: 'runningDesc',
    icon: Gauge,
    color: '#00D4FF',
    render: () => <RunningScreen />,
  },
  {
    id: 'colorize',
    titleKey: 'colorizeTitle',
    descKey: 'colorizeDesc',
    icon: Palette,
    color: '#A855F7',
    render: () => <ColorizeScreen />,
  },
  {
    id: 'logo',
    titleKey: 'logoTitle',
    descKey: 'logoDesc',
    icon: ImageIcon,
    color: '#F59E0B',
    render: () => <LogoScreen />,
  },
  {
    id: 'wifi-audio',
    titleKey: 'wifiAudioTitle',
    descKey: 'wifiAudioDesc',
    icon: Wifi,
    color: '#10B981',
    render: () => <WifiAudioScreen />,
  },
  {
    id: 'ota',
    titleKey: 'otaTitle',
    descKey: 'otaDesc',
    icon: Download,
    color: '#6366F1',
    render: () => <OtaScreen />,
  },
]

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AppShowcaseSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [activeIndex, setActiveIndex] = useState(0)
  const t = useTranslations('AppShowcase')

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' }, [
    Autoplay({ delay: 4000, stopOnInteraction: true }),
  ])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  const activeScreen = appScreens[activeIndex]

  return (
    <section id="app" className="relative py-24 lg:py-32 overflow-hidden" ref={ref}>
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
            {t('title')} <span className="text-gradient">{t('titleHighlight')}</span>{' '}
            {t('titleSuffix')}
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t('subtitle')}</p>
        </motion.div>

        {/* ─── Phone Mockup + Carousel ─── */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 mb-16"
        >
          {/* Left annotations (desktop) */}
          <div className="hidden lg:flex flex-col gap-4 w-48 text-right">
            {appScreens.slice(0, 3).map((screen, i) => {
              const Icon = screen.icon
              return (
                <motion.button
                  key={screen.id}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`flex items-center justify-end gap-3 p-3 rounded-xl transition-all text-right ${
                    activeIndex === i
                      ? 'bg-white/5 border border-white/10'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  whileHover={{ x: -4 }}
                >
                  <div>
                    <p
                      className={`text-sm font-medium ${activeIndex === i ? 'text-white' : 'text-gray-300'}`}
                    >
                      {t(screen.titleKey)}
                    </p>
                    <p className="text-[11px] text-gray-500 leading-tight">{t(screen.descKey)}</p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${screen.color}20`,
                      borderColor: `${screen.color}40`,
                      borderWidth: 1,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: screen.color }} />
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Phone Mockup with 3D tilt */}
          <div className="relative" style={{ perspective: '1200px' }}>
            <div
              className="relative transition-transform duration-500"
              style={{ transform: 'rotateY(-5deg) rotateX(2deg)' }}
            >
              {/* Phone frame */}
              <div className="w-[260px] sm:w-[280px] h-[520px] sm:h-[560px] rounded-[2.5rem] border-[6px] border-dark-600 bg-dark-900 overflow-hidden shadow-2xl shadow-black/50 relative">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-dark-600 rounded-full z-20" />

                {/* Carousel inside phone */}
                <div className="w-full h-full overflow-hidden" ref={emblaRef}>
                  <div className="flex h-full">
                    {appScreens.map((screen) => (
                      <div key={screen.id} className="flex-[0_0_100%] min-w-0 h-full">
                        {screen.render()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full bg-white/20 z-20" />
              </div>

              {/* Phone glow */}
              <div
                className="absolute -inset-4 rounded-[3.5rem] blur-2xl -z-10 transition-colors duration-500"
                style={{ backgroundColor: `${activeScreen.color}15` }}
              />

              {/* Reflection */}
              <div className="absolute -inset-1 rounded-[3rem] bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            </div>

            {/* Navigation arrows */}
            <button
              onClick={scrollPrev}
              className="absolute left-[-3rem] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-dark-700 border border-white/10 flex items-center justify-center hover:border-primary/40 transition-colors"
              aria-label={t('prevPage')}
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-[-3rem] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-dark-700 border border-white/10 flex items-center justify-center hover:border-primary/40 transition-colors"
              aria-label={t('nextPage')}
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Right annotations (desktop) */}
          <div className="hidden lg:flex flex-col gap-4 w-48 text-left">
            {appScreens.slice(3, 6).map((screen, i) => {
              const Icon = screen.icon
              const realIndex = i + 3
              return (
                <motion.button
                  key={screen.id}
                  onClick={() => emblaApi?.scrollTo(realIndex)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    activeIndex === realIndex
                      ? 'bg-white/5 border border-white/10'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  whileHover={{ x: 4 }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${screen.color}20`,
                      borderColor: `${screen.color}40`,
                      borderWidth: 1,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: screen.color }} />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${activeIndex === realIndex ? 'text-white' : 'text-gray-300'}`}
                    >
                      {t(screen.titleKey)}
                    </p>
                    <p className="text-[11px] text-gray-500 leading-tight">{t(screen.descKey)}</p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Mobile: horizontal scroll indicators + current label */}
        <div className="lg:hidden mb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-center mb-4"
            >
              <p className="text-sm font-medium text-white">{t(activeScreen.titleKey)}</p>
              <p className="text-xs text-gray-400">{t(activeScreen.descKey)}</p>
            </motion.div>
          </AnimatePresence>
          {/* Dots */}
          <div className="flex justify-center gap-2">
            {appScreens.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  activeIndex === i ? 'bg-primary w-6' : 'bg-white/20'
                }`}
                aria-label={t('switchToPage', { n: i + 1 })}
              />
            ))}
          </div>
        </div>

        {/* ─── Download Buttons ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4"
        >
          {/* APK Direct Download */}
          <a
            href="https://github.com/SunnyKlara/Zcritical/releases/download/v1.0.0/ridewind-v1.0.0.apk"
            className="flex items-center gap-3 px-6 py-3 bg-primary/10 border border-primary/30 rounded-xl hover:bg-primary/20 hover:border-primary/50 transition-all group"
          >
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <div className="text-left">
              <p className="text-[10px] text-gray-400">{t('downloadApk')}</p>
              <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                {t('downloadApkLabel')}
              </p>
            </div>
          </a>

          {/* Google Play (coming soon) */}
          <div className="flex items-center gap-3 px-6 py-3 bg-dark-700/50 border border-white/10 rounded-xl opacity-60 cursor-not-allowed">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
            </svg>
            <div className="text-left">
              <p className="text-[10px] text-gray-500">{t('downloadGooglePlay')}</p>
              <p className="text-sm font-medium text-gray-400">{t('downloadComingSoon')}</p>
            </div>
          </div>

          {/* App Store (coming soon) */}
          <div className="flex items-center gap-3 px-6 py-3 bg-dark-700/50 border border-white/10 rounded-xl opacity-60 cursor-not-allowed">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <div className="text-left">
              <p className="text-[10px] text-gray-500">{t('downloadAppStore')}</p>
              <p className="text-sm font-medium text-gray-400">{t('downloadComingSoon')}</p>
            </div>
          </div>
        </motion.div>

        {/* Version info */}
        <p className="text-center text-xs text-gray-600 mt-6">{t('versionInfo')}</p>
      </div>

      {/* Background decoration */}
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-purple-500/[0.03] rounded-full blur-3xl pointer-events-none" />
    </section>
  )
}
