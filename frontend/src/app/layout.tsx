import type { Metadata } from 'next'
import { Inter, Noto_Sans_SC, JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { OrganizationSchema, WebSiteSchema } from '@/components/seo/StructuredData'
import CookieConsent from '@/components/CookieConsent'
import ChatWidgetWrapper from '@/components/ChatWidgetWrapper'
import WebVitals from '@/components/WebVitals'
import SentryInit from '@/components/SentryInit'
import './globals.css'

// ─── Fonts ───────────────────────────────────────────────────────────────────

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-sc',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

// ─── Metadata ────────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://critical.bike'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Critical — 智能风洞模拟器 | 骑行沉浸体验',
    template: '%s | Critical',
  },
  description:
    'Critical 智能风洞模拟器，风速模拟+LED灯效+引擎音效+雾化器四维联动，APP蓝牙控制，打造极致骑行沉浸体验。',
  keywords: [
    '智能风洞',
    '骑行模拟器',
    'Critical',
    'Wind Tunnel',
    'Indoor Cycling',
    'ESP32',
    'BLE',
    'OTA',
  ],
  authors: [{ name: 'Critical' }],
  creator: 'Critical',
  applicationName: 'Critical',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'Critical — 智能风洞模拟器',
    description: '风·光·声·雾 四维沉浸式骑行体验',
    type: 'website',
    siteName: 'Critical',
    locale: 'zh_CN',
    images: [
      {
        url: '/images/og-cover.jpg',
        width: 1200,
        height: 630,
        alt: 'Critical 智能风洞模拟器',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Critical — 智能风洞模拟器',
    description: '风·光·声·雾 四维沉浸式骑行体验',
    images: ['/images/og-cover.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

// ─── Root Layout ─────────────────────────────────────────────────────────────

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="scroll-smooth">
      <head>
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body
        className={`
          ${inter.variable}
          ${notoSansSC.variable}
          ${jetbrainsMono.variable}
          ${geistMono.variable}
          font-sans antialiased
        `}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-dark-900 focus:rounded-lg focus:font-medium focus:outline-none"
        >
          跳转到主内容
        </a>
        {children}
        <ChatWidgetWrapper />
        <CookieConsent />
        <WebVitals />
        <SentryInit />
      </body>
    </html>
  )
}
