import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Critical — 智能风洞模拟器',
    short_name: 'Critical',
    description: '风·光·声·雾 四维沉浸式骑行体验',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#00D4FF',
    orientation: 'portrait',
    // Icons use SVG for infinite scaling without resolution loss.
    // Replace with PNG (192/512) before launch — see public/icons/README.md.
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
