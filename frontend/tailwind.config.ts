import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── Color Tokens ────────────────────────────────────────────────
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Brand primary — 电光蓝 (CTA, highlights, LED effects)
        primary: {
          DEFAULT: '#00D4FF',
          dark: '#00A3CC',
          light: '#66E5FF',
          50: 'rgba(0, 212, 255, 0.05)',
          100: 'rgba(0, 212, 255, 0.1)',
          200: 'rgba(0, 212, 255, 0.2)',
          300: 'rgba(0, 212, 255, 0.3)',
          500: '#00D4FF',
        },
        // Accent — 赛车红 (speed-related elements)
        accent: {
          DEFAULT: '#FF3B30',
          dark: '#CC2F26',
          light: '#FF6B63',
        },
        // Neutral dark scale — 背景层级
        dark: {
          950: '#0A0A0A', // Deepest background
          900: '#0A0A0F', // Page background
          850: '#0F0F1A', // Subtle elevation
          800: '#12121A', // Card background
          750: '#161625', // Elevated card
          700: '#1A1A2E', // Section accent bg
          600: '#222230', // Borders, dividers
          500: '#2A2A3A', // Hover states
        },
        // Text hierarchy
        text: {
          primary: '#FFFFFF',
          secondary: '#A0A0B0',
          tertiary: '#6B6B80',
          muted: '#4A4A5A',
        },
        // Surface tokens (glass cards)
        surface: {
          card: 'rgba(255, 255, 255, 0.05)',
          'card-hover': 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(255, 255, 255, 0.1)',
          'border-hover': 'rgba(255, 255, 255, 0.15)',
        },
      },

      // ─── Typography ──────────────────────────────────────────────────
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'var(--font-noto-sans-sc)',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: ['var(--font-jetbrains-mono)', 'var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-inter)', 'var(--font-noto-sans-sc)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Display sizes for hero/section headers
        'display-xl': [
          '4.5rem',
          { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'display-lg': [
          '3.5rem',
          { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'display-md': [
          '2.5rem',
          { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' },
        ],
        'display-sm': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '700' }],
      },

      // ─── Spacing System ──────────────────────────────────────────────
      spacing: {
        'section-desktop': '120px',
        'section-mobile': '80px',
        'card-gap': '24px',
      },
      maxWidth: {
        content: '1200px',
      },

      // ─── Border Radius ───────────────────────────────────────────────
      borderRadius: {
        card: '16px',
        'card-lg': '24px',
        button: '12px',
      },

      // ─── Shadows ─────────────────────────────────────────────────────
      boxShadow: {
        'glow-sm': '0 0 15px rgba(0, 212, 255, 0.15)',
        'glow-md': '0 0 25px rgba(0, 212, 255, 0.25), 0 0 60px rgba(0, 212, 255, 0.1)',
        'glow-lg': '0 0 40px rgba(0, 212, 255, 0.35), 0 0 80px rgba(0, 212, 255, 0.15)',
        'glow-accent': '0 0 20px rgba(255, 59, 48, 0.3), 0 0 60px rgba(255, 59, 48, 0.1)',
        card: '0 4px 24px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 212, 255, 0.08)',
      },

      // ─── Animations ──────────────────────────────────────────────────
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'scroll-hint': 'scroll-hint 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'scale-in': 'scale-in 0.5s ease-out forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scroll-hint': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },

      // ─── Transitions ─────────────────────────────────────────────────
      transitionDuration: {
        hover: '300ms',
        enter: '600ms',
      },
      transitionTimingFunction: {
        'smooth-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      // ─── Backdrop Blur ───────────────────────────────────────────────
      backdropBlur: {
        card: '12px',
        nav: '20px',
      },
    },
  },
  plugins: [],
}
export default config
