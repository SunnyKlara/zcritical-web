'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from '@/i18n/navigation'
import {
  Package,
  Power,
  RotateCw,
  Wind,
  Palette,
  CloudFog,
  Volume2,
  Bluetooth,
  Smartphone,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  Check,
  Minus,
  ArrowLeft,
  Sparkles,
  Gauge,
  ChevronRight,
} from 'lucide-react'

/* ════════════════════════════════════════════════════════════════════
   配色全部走 CSS 变量（--g-*），底部「配色方案」切换器实时换肤。
   选中喜欢的方案后告诉我，定稿并推广到全站。
   ════════════════════════════════════════════════════════════════════ */

type PaletteVars = {
  bg: string
  bgAlt: string
  surface: string
  border: string
  text: string
  muted: string
  heading: string
  primary: string
  primaryFg: string
  primarySoft: string
  accent: string
}
type PaletteDef = { id: string; name: string; dark: boolean; swatch: string; v: PaletteVars }

const PALETTES: PaletteDef[] = [
  {
    id: 'midnight',
    name: '曜夜蓝',
    dark: true,
    swatch: '#4C8DFF',
    v: {
      bg: '#0B1020',
      bgAlt: '#121A30',
      surface: '#161F38',
      border: 'rgba(255,255,255,0.10)',
      text: '#D7DEEC',
      muted: '#8A93A8',
      heading: '#FFFFFF',
      primary: '#4C8DFF',
      primaryFg: '#06122B',
      primarySoft: 'rgba(76,141,255,0.14)',
      accent: '#22D3EE',
    },
  },
  {
    id: 'graphite',
    name: '石墨橙',
    dark: true,
    swatch: '#F97316',
    v: {
      bg: '#0E0E11',
      bgAlt: '#17171C',
      surface: '#1C1C22',
      border: 'rgba(255,255,255,0.10)',
      text: '#E7E7EA',
      muted: '#9A9AA3',
      heading: '#FFFFFF',
      primary: '#F97316',
      primaryFg: '#1A0E03',
      primarySoft: 'rgba(249,115,22,0.15)',
      accent: '#FACC15',
    },
  },
  {
    id: 'carbon',
    name: '赛道红',
    dark: true,
    swatch: '#EF4444',
    v: {
      bg: '#0A0A0C',
      bgAlt: '#141417',
      surface: '#1A1A1E',
      border: 'rgba(255,255,255,0.10)',
      text: '#EDEDF0',
      muted: '#9CA3AF',
      heading: '#FFFFFF',
      primary: '#EF4444',
      primaryFg: '#1A0303',
      primarySoft: 'rgba(239,68,68,0.15)',
      accent: '#F59E0B',
    },
  },
  {
    id: 'teal',
    name: '青墨',
    dark: true,
    swatch: '#2DD4BF',
    v: {
      bg: '#07120F',
      bgAlt: '#0E1E19',
      surface: '#122620',
      border: 'rgba(255,255,255,0.10)',
      text: '#DCEFE9',
      muted: '#85A79C',
      heading: '#FFFFFF',
      primary: '#2DD4BF',
      primaryFg: '#04140F',
      primarySoft: 'rgba(45,212,191,0.14)',
      accent: '#A3E635',
    },
  },
  {
    id: 'arctic',
    name: '极简白',
    dark: false,
    swatch: '#2563EB',
    v: {
      bg: '#FFFFFF',
      bgAlt: '#F8FAFC',
      surface: '#FFFFFF',
      border: '#E2E8F0',
      text: '#334155',
      muted: '#64748B',
      heading: '#0F172A',
      primary: '#2563EB',
      primaryFg: '#FFFFFF',
      primarySoft: '#EFF6FF',
      accent: '#F59E0B',
    },
  },
  {
    id: 'sand',
    name: '暖砂',
    dark: false,
    swatch: '#0D9488',
    v: {
      bg: '#FAF7F2',
      bgAlt: '#F3EEE6',
      surface: '#FFFFFF',
      border: '#E7E0D5',
      text: '#44403C',
      muted: '#78716C',
      heading: '#1C1917',
      primary: '#0D9488',
      primaryFg: '#FFFFFF',
      primarySoft: '#E6F4F2',
      accent: '#EA580C',
    },
  },
]

function paletteStyle(p: PaletteDef): React.CSSProperties {
  return {
    '--g-bg': p.v.bg,
    '--g-bg-alt': p.v.bgAlt,
    '--g-surface': p.v.surface,
    '--g-border': p.v.border,
    '--g-text': p.v.text,
    '--g-muted': p.v.muted,
    '--g-heading': p.v.heading,
    '--g-primary': p.v.primary,
    '--g-primary-fg': p.v.primaryFg,
    '--g-primary-soft': p.v.primarySoft,
    '--g-accent': p.v.accent,
  } as React.CSSProperties
}

type Tier = 'basic' | 'plus' | 'flagship'
const TIER_LABEL: Record<Tier, string> = { basic: '普通款', plus: '升级款', flagship: '旗舰款' }

const NAV: { id: string; label: string; icon: typeof Package }[] = [
  { id: 'tiers', label: '套餐对比', icon: Package },
  { id: 'box', label: '开箱与硬件', icon: Package },
  { id: 'power', label: '开机与圆屏', icon: Power },
  { id: 'knob', label: '旋钮操作', icon: RotateCw },
  { id: 'speed', label: '风速 × 跑步机', icon: Wind },
  { id: 'light', label: '灯光灯效', icon: Palette },
  { id: 'fog', label: '雾化氛围', icon: CloudFog },
  { id: 'engine', label: '引擎声（旗舰）', icon: Volume2 },
  { id: 'connect', label: '连接 App', icon: Bluetooth },
  { id: 'app', label: 'App 功能', icon: Smartphone },
  { id: 'ota', label: '固件升级', icon: RefreshCw },
  { id: 'faq', label: '常见问题', icon: HelpCircle },
  { id: 'care', label: '安全保养', icon: ShieldCheck },
]

function TierTag({ tiers }: { tiers: Tier[] }) {
  const all = tiers.length === 3
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-[var(--g-muted)]">适用</span>
      {all ? (
        <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--g-primary-soft)] text-[var(--g-primary)] ring-1 ring-[var(--g-border)]">
          全系标配
        </span>
      ) : (
        tiers.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 rounded-full text-xs bg-[var(--g-primary-soft)] text-[var(--g-primary)] ring-1 ring-[var(--g-border)]"
          >
            {TIER_LABEL[t]}
          </span>
        ))
      )}
    </div>
  )
}

function Section({
  id,
  title,
  icon: Icon,
  tiers,
  lead,
  children,
}: {
  id: string
  title: string
  icon: typeof Package
  tiers?: Tier[]
  lead?: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="scroll-mt-24"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[var(--g-primary)] text-[var(--g-primary-fg)] flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--g-heading)] tracking-tight">{title}</h2>
      </div>
      {tiers && (
        <div className="mb-4">
          <TierTag tiers={tiers} />
        </div>
      )}
      {lead && <p className="text-[var(--g-muted)] text-[15px] leading-relaxed mb-5">{lead}</p>}
      <div className="space-y-4 text-[15px] text-[var(--g-text)] leading-relaxed">{children}</div>
    </motion.section>
  )
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex-none w-6 h-6 rounded-full bg-[var(--g-primary)] text-[var(--g-primary-fg)] text-xs font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span className="text-[var(--g-text)] leading-relaxed whitespace-pre-line">{s}</span>
        </li>
      ))}
    </ol>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl ring-1 ring-[var(--g-border)] bg-[var(--g-primary-soft)] px-4 py-3">
      <Sparkles className="w-4 h-4 text-[var(--g-primary)] flex-none mt-0.5" />
      <div className="text-sm text-[var(--g-text)] leading-relaxed">{children}</div>
    </div>
  )
}

/* ─── 设备结构示意图 ─── */
const PARTS = [
  { n: 1, label: '1.28″ 圆形屏幕', x: '72%', y: '16%' },
  { n: 2, label: '旋钮 / 编码器', x: '72%', y: '34%' },
  { n: 3, label: '出风口（风扇）', x: '18%', y: '50%' },
  { n: 4, label: '雾化口', x: '18%', y: '70%' },
  { n: 5, label: '跑步机接口', x: '72%', y: '74%' },
  { n: 6, label: '电源接口', x: '72%', y: '90%' },
]

function DeviceDiagram() {
  return (
    <div className="grid sm:grid-cols-[1fr_220px] gap-6 items-center">
      <div className="relative mx-auto w-full max-w-[300px] aspect-[5/6]">
        <svg viewBox="0 0 200 240" className="w-full h-full" aria-label="设备结构示意图">
          <rect x="30" y="206" width="140" height="20" rx="8" fill="#94a3b8" opacity="0.4" />
          <rect
            x="52"
            y="20"
            width="96"
            height="190"
            rx="20"
            fill="var(--g-surface)"
            stroke="var(--g-border)"
            strokeWidth="2"
          />
          <circle cx="100" cy="58" r="26" fill="#0b1220" />
          <circle cx="100" cy="58" r="26" fill="none" stroke="var(--g-primary)" strokeWidth="2" />
          <text
            x="100"
            y="63"
            textAnchor="middle"
            fontSize="11"
            fill="var(--g-primary)"
            fontWeight="bold"
          >
            240
          </text>
          <circle
            cx="100"
            cy="104"
            r="13"
            fill="var(--g-bg-alt)"
            stroke="var(--g-muted)"
            strokeWidth="2"
          />
          <rect x="99" y="93" width="2" height="8" rx="1" fill="var(--g-muted)" />
          <circle
            cx="100"
            cy="150"
            r="22"
            fill="none"
            stroke="var(--g-muted)"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <circle
            cx="100"
            cy="150"
            r="15"
            fill="none"
            stroke="var(--g-muted)"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <circle
            cx="100"
            cy="150"
            r="8"
            fill="none"
            stroke="var(--g-muted)"
            strokeWidth="1.5"
            opacity="0.4"
          />
          <rect x="78" y="184" width="44" height="6" rx="3" fill="var(--g-muted)" opacity="0.4" />
        </svg>
        {PARTS.map((p) => (
          <div
            key={p.n}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: p.x, top: p.y }}
          >
            <span className="w-6 h-6 rounded-full bg-[var(--g-primary)] text-[var(--g-primary-fg)] text-xs font-bold flex items-center justify-center ring-4 ring-[var(--g-bg)] shadow">
              {p.n}
            </span>
          </div>
        ))}
      </div>
      <ul className="space-y-2.5">
        {PARTS.map((p) => (
          <li key={p.n} className="flex items-center gap-2.5 text-sm text-[var(--g-text)]">
            <span className="flex-none w-5 h-5 rounded-full bg-[var(--g-primary-soft)] text-[var(--g-primary)] text-[11px] font-bold flex items-center justify-center">
              {p.n}
            </span>
            {p.label}
          </li>
        ))}
        <li className="text-xs text-[var(--g-muted)] pt-1">* 结构示意图，最终以实物为准</li>
      </ul>
    </div>
  )
}

/* ─── 交互演示：速度 → 风扇 + 跑步机 实时联动 ─── */
function SpeedLinkageDemo() {
  const MAX = 340
  const [speed, setSpeed] = useState(170)
  const ratio = speed / MAX
  const fan = Math.round(ratio * 100)
  const gear = Math.round(ratio * 20)
  const running = speed > 0
  const spinDur = running ? Math.max(0.18, 1.8 - ratio * 1.6) : 0
  const flowDur = running ? Math.max(0.35, 2.2 - ratio * 1.9) : 0
  const playState = running ? 'running' : 'paused'

  return (
    <div className="rounded-2xl ring-1 ring-[var(--g-border)] bg-[var(--g-surface)] p-5 sm:p-6">
      <div className="grid sm:grid-cols-2 gap-6 items-center">
        <div className="relative h-44 rounded-xl bg-[#0b1220] overflow-hidden">
          {[18, 38, 58, 78, 98, 118].map((y, i) => (
            <span
              key={y}
              className="absolute h-[2px] rounded-full bg-[var(--g-primary)]"
              style={{
                top: y,
                left: 0,
                width: `${30 + ratio * 50}%`,
                opacity: running ? 0.25 + ratio * 0.6 : 0.1,
                animation: running ? `led-chase ${flowDur + i * 0.05}s linear infinite` : 'none',
              }}
            />
          ))}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg
              viewBox="0 0 64 64"
              className="w-16 h-16 text-[var(--g-primary)]"
              style={{
                animation: spinDur ? `spin ${spinDur}s linear infinite` : 'none',
                animationPlayState: playState,
              }}
            >
              <g fill="currentColor">
                <ellipse cx="32" cy="18" rx="6" ry="13" />
                <ellipse cx="32" cy="46" rx="6" ry="13" />
                <ellipse cx="18" cy="32" rx="13" ry="6" />
                <ellipse cx="46" cy="32" rx="13" ry="6" />
              </g>
              <circle cx="32" cy="32" r="5" fill="#fff" />
            </svg>
          </div>
          <div className="absolute left-4 bottom-3">
            <div className="text-3xl font-bold text-white tabular-nums leading-none">{speed}</div>
            <div className="text-[11px] text-slate-400 mt-1">km/h 模拟风速</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--g-heading)] mb-2">
            拖动调节速度
          </label>
          <input
            type="range"
            min={0}
            max={MAX}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{ accentColor: 'var(--g-primary)' }}
            aria-label="速度调节"
          />
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl bg-[var(--g-primary-soft)] ring-1 ring-[var(--g-border)] p-3">
              <div className="text-xs text-[var(--g-muted)] mb-1 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-[var(--g-primary)]" /> 风扇
              </div>
              <div className="text-2xl font-bold text-[var(--g-primary)] tabular-nums">{fan}%</div>
            </div>
            <div className="rounded-xl bg-[var(--g-bg-alt)] ring-1 ring-[var(--g-border)] p-3">
              <div className="text-xs text-[var(--g-muted)] mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-[var(--g-text)]" /> 跑步机
              </div>
              <div className="text-2xl font-bold text-[var(--g-heading)] tabular-nums">
                {gear} 档
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--g-muted)] mt-3">一个速度，风扇与跑步机同步联动。</p>
        </div>
      </div>
    </div>
  )
}

/* ─── 模拟圆屏 ─── */
const SCREEN_PAGES = ['风速', '灯效', '音效', '雾化', '设置', '关于']
function RoundScreenDemo() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SCREEN_PAGES.length), 1400)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-32 h-32 rounded-full bg-[#0b1220] ring-4 ring-[var(--g-border)] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 rounded-full ring-1 ring-[var(--g-primary)] opacity-40" />
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center"
        >
          <div className="text-[var(--g-primary)] text-lg font-bold">{SCREEN_PAGES[idx]}</div>
          <div className="text-[10px] text-slate-500 mt-1">{idx + 1} / 6</div>
        </motion.div>
      </div>
      <div className="flex flex-wrap gap-1.5 max-w-[180px]">
        {SCREEN_PAGES.map((p, i) => (
          <span
            key={p}
            className={`px-2 py-1 rounded-md text-xs transition-colors ${
              i === idx
                ? 'bg-[var(--g-primary)] text-[var(--g-primary-fg)]'
                : 'bg-[var(--g-bg-alt)] text-[var(--g-muted)]'
            }`}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}

const GESTURES = [
  { g: '旋转', d: '切换菜单页 / 调节数值（风速·颜色·亮度·音量）' },
  { g: '单击', d: '进入页面 / 确认 / 返回' },
  { g: '双击 · 三击', d: '快捷操作（快速切灯效、一键归零）' },
  { g: '长按', d: '进入设置 / 长按约 5 秒恢复出厂' },
]

/* ─── 套餐卡片 ─── */
const TIER_CARDS: {
  tier: Tier
  name: string
  tagline: string
  highlight?: boolean
  features: string[]
}[] = [
  {
    tier: 'basic',
    name: '普通款',
    tagline: '纯硬件 · 即插即用',
    features: [
      '圆屏 + 旋钮操控',
      '无级风速调节',
      '灯光 / 动态灯效',
      '跑步机 × 风扇联动',
      '雾化氛围',
    ],
  },
  {
    tier: 'plus',
    name: '升级款',
    tagline: '接入手机 App · 玩法翻倍',
    highlight: true,
    features: [
      '普通款全部功能',
      '手机 App 蓝牙控制',
      '自定义图片上传圆屏',
      'WiFi 音乐投射',
      'OTA 固件无线升级',
    ],
  },
  {
    tier: 'flagship',
    name: '旗舰款',
    tagline: '引擎声浪 · 极致沉浸',
    features: ['升级款全部功能', '实时合成引擎声', '随速度升降调声效', '赛道级临场感'],
  },
]

const MATRIX: { feature: string; basic: boolean; plus: boolean; flagship: boolean }[] = [
  { feature: '圆屏 + 旋钮操控', basic: true, plus: true, flagship: true },
  { feature: '无级风速调节', basic: true, plus: true, flagship: true },
  { feature: '灯光 / 动态灯效', basic: true, plus: true, flagship: true },
  { feature: '跑步机 × 风扇联动', basic: true, plus: true, flagship: true },
  { feature: '雾化氛围', basic: true, plus: true, flagship: true },
  { feature: '手机 App · 蓝牙控制', basic: false, plus: true, flagship: true },
  { feature: '自定义图片上传圆屏', basic: false, plus: true, flagship: true },
  { feature: 'WiFi 音乐投射', basic: false, plus: true, flagship: true },
  { feature: 'OTA 固件无线升级', basic: false, plus: true, flagship: true },
  { feature: '引擎声实时合成', basic: false, plus: false, flagship: true },
]

function Cell({ on, accent }: { on: boolean; accent?: boolean }) {
  return (
    <td className="py-3 px-3 text-center">
      {on ? (
        <Check
          className={`w-4 h-4 inline-block ${accent ? 'text-[var(--g-accent)]' : 'text-[var(--g-primary)]'}`}
        />
      ) : (
        <Minus className="w-4 h-4 text-[var(--g-muted)] opacity-50 inline-block" />
      )}
    </td>
  )
}

/* ─── 配色切换器（浮动） ─── */
function PalettePicker({ idx, onPick }: { idx: number; onPick: (i: number) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-2xl bg-[var(--g-surface)] ring-1 ring-[var(--g-border)] shadow-xl p-3 w-[200px]">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[var(--g-heading)] mb-2"
        >
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[var(--g-primary)]" /> 配色方案预览
          </span>
          <span className="text-[var(--g-muted)]">{open ? '−' : '+'}</span>
        </button>
        {open && (
          <div className="grid grid-cols-3 gap-2">
            {PALETTES.map((p, i) => (
              <button
                key={p.id}
                onClick={() => onPick(i)}
                className={`rounded-lg p-1.5 ring-1 transition-all ${
                  i === idx
                    ? 'ring-[var(--g-primary)]'
                    : 'ring-[var(--g-border)] hover:ring-[var(--g-muted)]'
                }`}
                title={p.name}
              >
                <span className="block w-full h-6 rounded" style={{ background: p.swatch }} />
                <span className="block text-[10px] text-[var(--g-text)] mt-1 truncate">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-[var(--g-muted)] mt-2 leading-snug">
          点选实时换肤，挑中告诉我即可定稿全站
        </p>
      </div>
    </div>
  )
}

export default function GuidePage() {
  const [activeId, setActiveId] = useState<string>(NAV[0].id)
  const [pal, setPal] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
    )
    NAV.forEach((n) => {
      const el = document.getElementById(n.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <main
      className="relative z-10 min-h-screen bg-[var(--g-bg)] text-[var(--g-text)]"
      style={paletteStyle(PALETTES[pal])}
    >
      <PalettePicker idx={pal} onPick={setPal} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--g-bg-alt)]/90 backdrop-blur border-b border-[var(--g-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[var(--g-primary)] text-[var(--g-primary-fg)] flex items-center justify-center font-bold text-sm">
              C
            </span>
            <span className="text-lg font-bold tracking-wider text-[var(--g-heading)]">
              CRITICAL
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--g-muted)] hover:text-[var(--g-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="border-b border-[var(--g-border)]"
        style={{ background: 'linear-gradient(to bottom, var(--g-bg-alt), var(--g-bg))' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--g-primary-soft)] text-[var(--g-primary)] text-xs font-medium ring-1 ring-[var(--g-border)] mb-5">
              <Sparkles className="w-3.5 h-3.5" /> 新手教程 · Getting Started
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-[var(--g-heading)] tracking-tight mb-4">
              5 分钟，玩转你的 Critical 风洞
            </h1>
            <p className="text-lg text-[var(--g-muted)] leading-relaxed mb-8">
              从开机到进阶，一步步带你上手全部功能。普通款 / 升级款 /
              旗舰款的差异，每节都标得清清楚楚。
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { i: Power, t: '通电开机' },
                { i: RotateCw, t: '旋钮选风速' },
                { i: Wind, t: '感受风浪' },
              ].map((c, i) => (
                <div
                  key={c.t}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--g-surface)] ring-1 ring-[var(--g-border)] pl-2 pr-4 py-1.5"
                >
                  <span className="w-6 h-6 rounded-full bg-[var(--g-primary)] text-[var(--g-primary-fg)] text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <c.i className="w-4 h-4 text-[var(--g-muted)]" />
                  <span className="text-sm text-[var(--g-text)]">{c.t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 flex gap-10">
        <aside className="hidden lg:block w-56 flex-none">
          <nav className="sticky top-24 space-y-0.5">
            <p className="text-[11px] uppercase tracking-wider text-[var(--g-muted)] px-3 mb-2">
              目录
            </p>
            {NAV.map((n) => {
              const active = activeId === n.id
              return (
                <a
                  key={n.id}
                  href={`#${n.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    active
                      ? 'bg-[var(--g-primary-soft)] text-[var(--g-primary)] font-medium'
                      : 'text-[var(--g-muted)] hover:text-[var(--g-heading)] hover:bg-[var(--g-surface)]'
                  }`}
                >
                  <n.icon className="w-4 h-4 flex-none" />
                  <span className="truncate">{n.label}</span>
                </a>
              )
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 space-y-16">
          {/* Tiers */}
          <Section
            id="tiers"
            title="套餐对比"
            icon={Package}
            lead="三个套餐，丰俭由人。普通款主打纯硬件即插即用；升级款接入手机 App；旗舰款再加引擎声浪。"
          >
            <div className="grid sm:grid-cols-3 gap-4">
              {TIER_CARDS.map((c) => (
                <div
                  key={c.tier}
                  className={`relative rounded-2xl p-5 ${
                    c.highlight
                      ? 'bg-[var(--g-primary)] text-[var(--g-primary-fg)]'
                      : 'bg-[var(--g-surface)] ring-1 ring-[var(--g-border)]'
                  }`}
                >
                  {c.highlight && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[var(--g-accent)] text-[var(--g-bg)] text-[11px] font-bold">
                      最受欢迎
                    </span>
                  )}
                  <div
                    className={`text-lg font-bold ${c.highlight ? '' : 'text-[var(--g-heading)]'}`}
                  >
                    {c.name}
                  </div>
                  <div
                    className={`text-xs mb-4 ${c.highlight ? 'opacity-80' : 'text-[var(--g-muted)]'}`}
                  >
                    {c.tagline}
                  </div>
                  <ul className="space-y-2">
                    {c.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check
                          className={`w-4 h-4 flex-none mt-0.5 ${c.highlight ? 'text-[var(--g-accent)]' : 'text-[var(--g-primary)]'}`}
                        />
                        <span className={c.highlight ? '' : 'text-[var(--g-text)]'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl ring-1 ring-[var(--g-border)] mt-2">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="bg-[var(--g-bg-alt)] text-[var(--g-muted)]">
                    <th className="text-left py-3 px-4 font-medium">功能</th>
                    <th className="py-3 px-3 font-medium">普通款</th>
                    <th className="py-3 px-3 font-medium text-[var(--g-primary)]">升级款</th>
                    <th className="py-3 px-3 font-medium text-[var(--g-accent)]">旗舰款</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => (
                    <tr key={row.feature} className="border-t border-[var(--g-border)]">
                      <td className="py-3 px-4 text-[var(--g-text)]">{row.feature}</td>
                      <Cell on={row.basic} />
                      <Cell on={row.plus} />
                      <Cell on={row.flagship} accent />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--g-muted)]">
              * 功能矩阵以最终量产配置为准。普通款不含蓝牙 / WiFi。
            </p>
          </Section>

          <Section
            id="box"
            title="开箱与硬件认识"
            icon={Package}
            tiers={['basic', 'plus', 'flagship']}
            lead="包装清单：主机 ×1、电源适配器 ×1、快速入门指南 ×1。先认识机身关键部位。"
          >
            <DeviceDiagram />
            <Tip>首次使用放在平稳通风的桌面上，出风口前方保持 30cm 以上无遮挡。</Tip>
          </Section>

          <Section
            id="power"
            title="开机与圆屏菜单"
            icon={Power}
            tiers={['basic', 'plus', 'flagship']}
            lead="接通电源即自动开机。圆屏是 6 页滑动菜单，旋钮一转就能逛遍全部功能。"
          >
            <RoundScreenDemo />
            <Steps
              items={[
                '接通电源适配器，设备自动开机，圆屏点亮。',
                '旋转旋钮在 6 个页面间切换：风速 → 灯效 → 音效 → 雾化 → 设置 → 关于。',
                '单击进入页面调节，再次单击返回。',
              ]}
            />
          </Section>

          <Section
            id="knob"
            title="旋钮基础操作"
            icon={RotateCw}
            tiers={['basic', 'plus', 'flagship']}
            lead="旋钮是普通款的全部操控方式，也是所有套餐的本机操控核心。"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              {GESTURES.map((g) => (
                <div
                  key={g.g}
                  className="rounded-xl ring-1 ring-[var(--g-border)] bg-[var(--g-surface)] p-4"
                >
                  <div className="text-[var(--g-heading)] font-semibold mb-1 flex items-center gap-2">
                    <RotateCw className="w-4 h-4 text-[var(--g-primary)]" />
                    {g.g}
                  </div>
                  <div className="text-sm text-[var(--g-muted)]">{g.d}</div>
                </div>
              ))}
            </div>
            <Tip>操作乱了想重来？长按旋钮约 5 秒恢复出厂设置。具体手势以机身说明卡为准。</Tip>
          </Section>

          <Section
            id="speed"
            title="风速 × 跑步机联动"
            icon={Wind}
            tiers={['basic', 'plus', 'flagship']}
            lead="这是 Critical 的灵魂：调速度时风扇与跑步机同步联动，速度越高、迎风越猛、跑步机越快。下面拖一下试试。"
          >
            <SpeedLinkageDemo />
            <Tip>跑步机 × 风扇联动是全系标配，普通款完全由机身旋钮驱动，无需 App。</Tip>
          </Section>

          <Section
            id="light"
            title="灯光与灯效"
            icon={Palette}
            tiers={['basic', 'plus', 'flagship']}
            lead="WS2812B 幻彩灯带（主灯带 + 尾灯，四区独立），14 色预设 + 多种动态灯效，提速时灯随速度律动。"
          >
            <Steps
              items={[
                '在「灯效」页旋转旋钮切换灯效与颜色，单击确认。',
                '调节亮度适应环境光。',
                '部分动态灯效随速度 / 油门实时变化，营造提速张力。',
              ]}
            />
            <Tip>升级款连 App 后可在「Colorize」用 RGB 调色盘自由配色、开启油门联动灯效。</Tip>
          </Section>

          <Section
            id="fog"
            title="雾化氛围"
            icon={CloudFog}
            tiers={['basic', 'plus', 'flagship']}
            lead="一键开雾，配合灯效与风力营造沉浸骑行环境。"
          >
            <Steps
              items={[
                '向雾化仓加注适量纯净水（勿用自来水或精油，以免堵塞）。',
                '在「雾化」页单击开启 / 关闭。',
                '配合灯效与风力，氛围拉满。',
              ]}
            />
            <Tip>水位过低及时补水，避免空烧雾化片；长期不用请倒空余水。</Tip>
          </Section>

          <Section
            id="engine"
            title="引擎声（旗舰专属）"
            icon={Volume2}
            tiers={['flagship']}
            lead="旗舰款内置实时合成引擎声浪：多层音频混音、随速度变速率交叉淡入，提速、巡航、收油各有声效。"
          >
            <Steps
              items={[
                '在「音效」页开启引擎声并选择声浪类型。',
                '调节音量到合适大小。',
                '随速度变化引擎声实时升降调，无需手动。',
              ]}
            />
            <Tip>仅旗舰款配备引擎声硬件 / 功能；普通款与升级款不含此体验。</Tip>
          </Section>

          <Section
            id="connect"
            title="连接 App（蓝牙）"
            icon={Bluetooth}
            tiers={['plus', 'flagship']}
            lead="升级款与旗舰款支持手机 App 蓝牙控制。先安装 Critical App，再按步骤配对。"
          >
            <Steps
              items={[
                '确保设备已通电、圆屏点亮，手机蓝牙已开启。',
                '打开 App 进入「设备」页，点击「扫描」。',
                '找到你的设备（名称形如 Critical-XXXX），点击配对，首次约 5–10 秒。',
                '连接成功即可在 App 内实时控制全部功能。',
              ]}
            />
            <Tip>连不上？确认设备通电、手机靠近 3 米内、蓝牙已开；可重启设备与 App 再试。</Tip>
          </Section>

          <Section
            id="app"
            title="App 功能详解"
            icon={Smartphone}
            tiers={['plus', 'flagship']}
            lead="掌上操控你的沉浸骑行体验。"
          >
            {[
              {
                t: 'Running 模式 · 速度与刹车',
                d: '实时速度仪表盘 + 油门控制。右侧油门按钮支持长按加速与多击分级刹车：长按持续加速、单击滑行刹车（约 70%）、双击标准刹车（回起始速度）、三击紧急全刹（立即归零）。',
              },
              {
                t: 'Colorize 模式 · 自由配色',
                d: '14 色预设 + RGB 调色盘自由配色，可保存自定义颜色胶囊，并为动态灯效开启油门联动。',
              },
              {
                t: '图片上传 · 自定义圆屏',
                d: '拍照或相册选图，把 Logo / 图片上传到机身 1.28″ 圆屏，支持多槽位切换。',
              },
              {
                t: 'WiFi 音乐投射',
                d: '手机与设备在同一 2.4GHz WiFi 下，开启「音频投射」把手机音乐实时推流到机身扬声器（5GHz 暂不支持）。',
              },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-xl ring-1 ring-[var(--g-border)] bg-[var(--g-surface)] p-4"
              >
                <div className="text-[var(--g-heading)] font-semibold mb-1.5 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-[var(--g-primary)]" />
                  {f.t}
                </div>
                <p className="text-sm text-[var(--g-muted)] leading-relaxed">{f.d}</p>
              </div>
            ))}
          </Section>

          <Section
            id="ota"
            title="固件升级 OTA"
            icon={RefreshCw}
            tiers={['plus', 'flagship']}
            lead="让设备常用常新。双分区 + Rollback 保护，升级失败自动回滚。"
          >
            <Steps
              items={[
                '打开 App 连接设备，进入「设置」→「固件升级」。',
                'App 自动检测新版本并引导升级，约 1–2 分钟，期间请勿断电。',
                '升级失败会自动回滚到上一个稳定版本，设备不会变砖。',
              ]}
            />
            <Tip>普通款不含蓝牙 / WiFi，固件出厂即固定；需远程升级请选升级款或旗舰款。</Tip>
          </Section>

          <Section id="faq" title="常见问题" icon={HelpCircle}>
            <div className="rounded-2xl ring-1 ring-[var(--g-border)] bg-[var(--g-surface)] overflow-hidden">
              {[
                {
                  q: '风扇 / 跑步机不动？',
                  a: '检查速度是否为 0、跑步机接口是否插好、电源是否接通。',
                },
                {
                  q: 'App 扫描不到设备？',
                  a: '确认是升级款 / 旗舰款（普通款无蓝牙）、设备已通电、手机蓝牙开启且距离够近。',
                },
                {
                  q: 'WiFi 音频卡顿 / 延迟大？',
                  a: '使用 2.4GHz WiFi、靠近路由器、减少遮挡；5GHz 不支持。',
                },
                { q: '雾化没有雾？', a: '检查水位，加注纯净水，避免空烧。' },
              ].map((f) => (
                <div key={f.q} className="p-4 border-b border-[var(--g-border)] last:border-0">
                  <p className="text-[var(--g-heading)] font-medium mb-1">Q：{f.q}</p>
                  <p className="text-sm text-[var(--g-muted)]">{f.a}</p>
                </div>
              ))}
            </div>
            <Tip>
              还没解决？邮件联系 support@zcritical.co，或前往「使用帮助」查看更多
              FAQ，我们会尽快回复。
            </Tip>
          </Section>

          <Section
            id="care"
            title="安全与保养"
            icon={ShieldCheck}
            tiers={['basic', 'plus', 'flagship']}
          >
            <ul className="space-y-2 list-disc pl-5 marker:text-[var(--g-primary)]">
              <li>使用原装电源适配器，勿私自改装供电。</li>
              <li>出风口、雾化口保持清洁，定期清理灰尘。</li>
              <li>雾化仓只加纯净水，长期不用请倒空。</li>
              <li>设备远离潮湿、高温，避免液体进入机身电路。</li>
              <li>跑步机联动使用时，确保周围安全无障碍物。</li>
            </ul>
          </Section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--g-border)] bg-[var(--g-bg-alt)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-[var(--g-muted)]">
            © {new Date().getFullYear()} Critical · 柯普碎影科技（深圳）有限公司
          </p>
          <Link href="/" className="text-sm text-[var(--g-primary)] hover:opacity-80">
            返回首页 →
          </Link>
        </div>
      </footer>
    </main>
  )
}
