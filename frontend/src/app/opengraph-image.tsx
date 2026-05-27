import { ImageResponse } from 'next/og'

// Force dynamic rendering — avoids Windows-specific prerender bug in
// @vercel/og's fileURLToPath. OG scrapers don't mind a fresh PNG per request.
export const dynamic = 'force-dynamic'
export const alt = 'Critical — Smart Wind Tunnel Simulator'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Programmatic Open Graph image at runtime/edge.
 * When social platforms scrape `/opengraph-image`, Next renders this JSX
 * to a 1200×630 PNG.
 *
 * Layout mirrors the brand identity: dark gradient + glowing CRITICAL
 * wordmark + four-pillar tagline + domain. No external assets required.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at center, rgba(0,212,255,0.12) 0%, rgba(0,0,0,0) 60%), linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0A0A0F 100%)',
        padding: 80,
        fontFamily: 'sans-serif',
      }}
    >
      {/* Badge */}
      <div
        style={{
          padding: '12px 32px',
          borderRadius: 999,
          background: 'rgba(0,212,255,0.05)',
          border: '1px solid rgba(0,212,255,0.3)',
          color: '#00D4FF',
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: 4,
          marginBottom: 40,
          display: 'flex',
        }}
      >
        IMMERSIVE CYCLING
      </div>

      {/* Wordmark */}
      <div
        style={{
          fontSize: 168,
          fontWeight: 800,
          letterSpacing: -6,
          background: 'linear-gradient(180deg, #66E5FF 0%, #00A3CC 100%)',
          backgroundClip: 'text',
          color: 'transparent',
          lineHeight: 1,
          marginBottom: 24,
          display: 'flex',
        }}
      >
        CRITICAL
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: 6,
          marginBottom: 48,
          display: 'flex',
        }}
      >
        FEEL THE WIND. OWN THE RIDE.
      </div>

      {/* Four pillars */}
      <div
        style={{
          display: 'flex',
          gap: 40,
          color: '#A0A0B0',
          fontSize: 26,
        }}
      >
        <span>风</span>
        <span style={{ color: '#4A4A5A' }}>·</span>
        <span>光</span>
        <span style={{ color: '#4A4A5A' }}>·</span>
        <span>声</span>
        <span style={{ color: '#4A4A5A' }}>·</span>
        <span>雾</span>
      </div>

      {/* Domain */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          color: '#6B6B80',
          fontSize: 18,
          letterSpacing: 2,
          fontFamily: 'monospace',
          display: 'flex',
        }}
      >
        zcritical.co
      </div>
    </div>,
    { ...size },
  )
}
