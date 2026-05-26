'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useTranslations } from 'next-intl'

// Canvas particle system simulating wind flow
function WindParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      life: number
      maxLife: number
      type: 'wind' | 'glow' | 'fog'
    }

    const particles: Particle[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const createParticle = (): Particle => {
      const type = Math.random() < 0.6 ? 'wind' : Math.random() < 0.7 ? 'glow' : 'fog'
      const maxLife = 100 + Math.random() * 200

      if (type === 'wind') {
        return {
          x: -10,
          y: Math.random() * canvas.height,
          vx: 2 + Math.random() * 4,
          vy: (Math.random() - 0.5) * 1.5,
          size: 1 + Math.random() * 2,
          opacity: 0,
          life: 0,
          maxLife,
          type,
        }
      } else if (type === 'glow') {
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: 2 + Math.random() * 4,
          opacity: 0,
          life: 0,
          maxLife: maxLife * 1.5,
          type,
        }
      } else {
        return {
          x: Math.random() * canvas.width,
          y: canvas.height * 0.6 + Math.random() * canvas.height * 0.4,
          vx: 0.3 + Math.random() * 0.8,
          vy: -0.2 - Math.random() * 0.5,
          size: 30 + Math.random() * 60,
          opacity: 0,
          life: 0,
          maxLife: maxLife * 2,
          type,
        }
      }
    }

    // Initialize particles
    for (let i = 0; i < 120; i++) {
      const p = createParticle()
      p.life = Math.random() * p.maxLife
      p.x = Math.random() * canvas.width
      particles.push(p)
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Add new particles
      if (particles.length < 150 && Math.random() < 0.3) {
        particles.push(createParticle())
      }

      particles.forEach((p, index) => {
        p.life++
        p.x += p.vx
        p.y += p.vy

        // Fade in/out based on life
        const lifeRatio = p.life / p.maxLife
        if (lifeRatio < 0.1) {
          p.opacity = lifeRatio / 0.1
        } else if (lifeRatio > 0.8) {
          p.opacity = (1 - lifeRatio) / 0.2
        } else {
          p.opacity = 1
        }

        if (p.type === 'wind') {
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x - p.vx * 8, p.y - p.vy * 8)
          ctx.strokeStyle = `rgba(0, 212, 255, ${p.opacity * 0.3})`
          ctx.lineWidth = p.size * 0.5
          ctx.lineCap = 'round'
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity * 0.6})`
          ctx.fill()
        } else if (p.type === 'glow') {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          gradient.addColorStop(0, `rgba(0, 212, 255, ${p.opacity * 0.4})`)
          gradient.addColorStop(1, `rgba(0, 212, 255, 0)`)
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        } else {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          gradient.addColorStop(0, `rgba(100, 150, 200, ${p.opacity * 0.04})`)
          gradient.addColorStop(0.5, `rgba(0, 212, 255, ${p.opacity * 0.02})`)
          gradient.addColorStop(1, `rgba(0, 0, 0, 0)`)
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }

        // Remove dead particles
        if (p.life >= p.maxLife || p.x > canvas.width + 50 || p.y < -50) {
          particles[index] = createParticle()
        }
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
}

export default function HeroSection() {
  const t = useTranslations('Hero')
  const sectionRef = useRef<HTMLDivElement>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  const contentY = useTransform(scrollYProgress, [0, 1], [0, 150])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.1])

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0A0A0F]"
    >
      {/* Video Background */}
      <motion.div className="absolute inset-0" style={{ scale: bgScale }}>
        {!videoError && (
          <video
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              videoLoaded ? 'opacity-40' : 'opacity-0'
            }`}
            autoPlay
            muted
            loop
            playsInline
            poster="/images/hero-poster.svg"
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
            <source src="/videos/hero-bg.webm" type="video/webm" />
          </video>
        )}

        {/* Canvas particle fallback */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            videoLoaded && !videoError ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {mounted && <WindParticles />}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/80 via-[#0A0A0F]/50 to-[#0A0A0F]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0F]/60 via-transparent to-[#0A0A0F]/60" />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-[#00D4FF]/[0.03] blur-[100px]" />
      </motion.div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,212,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.4) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Content with parallax */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 text-center px-4 max-w-5xl mx-auto"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <span className="inline-block px-4 py-1.5 rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/5 text-[#00D4FF] text-sm font-medium backdrop-blur-sm">
            {t('badge')}
          </span>
        </motion.div>

        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          className="mb-8"
        >
          <h1 className="text-6xl sm:text-7xl lg:text-9xl font-bold tracking-tight">
            <span
              className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-[#00D4FF] to-[#60a5fa]"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.3))',
              }}
            >
              CRITICAL
            </span>
          </h1>
        </motion.div>

        {/* Slogan */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-xl sm:text-2xl lg:text-3xl text-gray-200 mb-3 font-light tracking-wide"
        >
          {t('slogan')}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-base sm:text-lg text-gray-400 mb-12 max-w-2xl mx-auto"
        >
          {t('subtitle')}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href="#overview"
            className="group relative px-8 py-4 bg-[#00D4FF] text-[#0A0A0F] font-semibold rounded-xl transition-all overflow-hidden"
          >
            <span className="relative z-10">{t('ctaPrimary')}</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </a>
          <a
            href="#specs"
            className="px-8 py-4 border border-white/20 text-white rounded-xl hover:border-[#00D4FF]/50 hover:text-[#00D4FF] hover:bg-[#00D4FF]/5 transition-all backdrop-blur-sm"
          >
            {t('ctaSecondary')}
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll hint arrow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
      >
        <span className="text-xs text-gray-500 tracking-widest uppercase">{t('scrollHint')}</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-6 h-10 rounded-full border border-white/20 flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1 h-2 rounded-full bg-[#00D4FF]"
          />
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0F] to-transparent pointer-events-none" />
    </section>
  )
}
