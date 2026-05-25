'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: '#0A0A0A',
          color: '#FFFFFF',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
          <div
            style={{
              fontSize: '4rem',
              marginBottom: '1rem',
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            系统错误
          </h1>
          <p style={{ color: '#A0A0B0', marginBottom: '2rem' }}>
            应用遇到了意外错误，请刷新页面重试。
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#00D4FF',
              color: '#0A0A0A',
              border: 'none',
              borderRadius: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            刷新页面
          </button>
        </div>
      </body>
    </html>
  )
}
