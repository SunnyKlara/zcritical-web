import { ImageResponse } from 'next/og'

// Force dynamic rendering — avoids Windows-specific prerender bug in
// @vercel/og's fileURLToPath.
export const dynamic = 'force-dynamic'

// Apple HIG: opaque squircle, 180×180 is the recommended PWA size.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 100%)',
        borderRadius: 40,
      }}
    >
      <div
        style={{
          fontSize: 124,
          fontWeight: 800,
          letterSpacing: -4,
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
