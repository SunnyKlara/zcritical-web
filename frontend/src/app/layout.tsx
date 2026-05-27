import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter, Noto_Sans_SC, JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { OrganizationSchema, WebSiteSchema } from '@/components/seo/StructuredData'
import { ThemeProvider } from '@/components/ThemeProvider'
import WebVitals from '@/components/WebVitals'
import SentryInit from '@/components/SentryInit'
import './globals.css'

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zcritical.co'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Critical — Smart Wind Tunnel Simulator',
    template: '%s | Critical',
  },
  description:
    'Critical smart wind tunnel simulator: wind speed, LED lighting, engine sound, fog effects with BLE app control.',
  authors: [{ name: 'Critical' }],
  creator: 'Critical',
  applicationName: 'Critical',
  alternates: {
    canonical: SITE_URL,
    languages: {
      'zh-CN': `${SITE_URL}/`,
      'en-US': `${SITE_URL}/en`,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Critical',
    // og:image is auto-injected from src/app/opengraph-image.tsx
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
  // Icons are auto-injected from src/app/icon.tsx + apple-icon.tsx
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Pull the per-request CSP nonce that middleware injected so any inline
  // <script>/<style> Next emits (e.g. next-themes' FOUC blocker) carries
  // a `nonce` attribute that satisfies our strict CSP.
  const nonce = headers().get('x-csp-nonce') ?? undefined

  return (
    <html suppressHydrationWarning className="scroll-smooth">
      <head>
        <OrganizationSchema nonce={nonce} />
        <WebSiteSchema nonce={nonce} />
      </head>
      <body
        className={`${inter.variable} ${notoSansSC.variable} ${jetbrainsMono.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem nonce={nonce}>
          {children}
          <WebVitals />
          <SentryInit />
        </ThemeProvider>
      </body>
    </html>
  )
}
