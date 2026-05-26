import { ImageResponse } from 'next/og'

// Force dynamic rendering — avoids Windows-specific prerender bug in
// @vercel/og's fileURLToPath.
export const dynamic = 'force-dynamic'

// Image metadata
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

/**
 * Programmatic 512×512 PNG icon, generated at build/edge time.
 *
 * Used by:
 *   - /favicon.ico (Next auto-generates a fallback)
 *   - PWA manifest "any" purpose
 *   - Some browsers' tab/bookmark icons
 *
 * Pure JSX — no external image asset required. Replace with a
 * `public/icon.png` master image if/when brand has one.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 100%)',
        borderRadius: '20%',
      }}
    >
      <div
        style={{
          fontSize: 360,
          fontWeight: 800,
          letterSpacing: -12,
          background: 'linear-gradient(180deg, #66E5FF 0%, #00A3CC 100%)',
          backgroundClip: 'text',
          color: 'transparent',
          display: 'flex',
          lineHeight: 1,
        }}
      >
        C
      </div>
    </div>,
    { ...size },
  )
}
