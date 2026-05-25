import express from 'express'
import http from 'http'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { pinoHttp } from 'pino-http'
import { Server as IOServer } from 'socket.io'
import { env, isProd, isTest } from './config/env'
import { logger } from './config/logger'
import { healthRouter } from './routes/health.routes'
import { leadRouter } from './routes/lead.routes'
import { authRouter } from './routes/auth.routes'
import { chatRouter } from './routes/chat.routes'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'
import { csrfCookieSetter, csrfProtection } from './middleware/csrf.middleware'
import { requestId } from './middleware/request-id.middleware'
import { registerSocketHandlers } from './socket'
import { initSentry, sentryRequestHandler, installSentryExpressErrorHandler } from './lib/sentry'

export function createServer(): {
  app: express.Express
  server: http.Server
  io: IOServer
} {
  initSentry()

  const app = express()
  const server = http.createServer(app)
  const io = new IOServer(server, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
    // Drop oversized payloads early
    maxHttpBufferSize: 1e6, // 1 MB
  })

  app.disable('x-powered-by')
  // Trust first proxy (Render / Cloudflare) so req.ip honors X-Forwarded-For.
  app.set('trust proxy', 1)

  // ─── Observability ─────────────────────────────────────────────────────────
  app.use(sentryRequestHandler)
  app.use(requestId) // attach req.id BEFORE pino-http so logs include it

  app.use(
    pinoHttp({
      logger,
      // Use request-id middleware's ID
      genReqId: (req) => (req as express.Request).id,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error'
        if (res.statusCode >= 400) return 'warn'
        return 'info'
      },
      // Skip noisy health checks at info level
      autoLogging: {
        ignore: (req) => {
          const url = (req as express.Request).originalUrl
          return url === '/api/health' || url === '/api/ready'
        },
      },
    }),
  )

  // ─── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", env.FRONTEND_URL, 'wss:', 'https:'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  )

  // ─── Compression (gzip/brotli) ────────────────────────────────────────────
  // Skip compression for Server-Sent Events / WebSocket upgrades.
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false
        return compression.filter(req, res)
      },
      threshold: 1024, // only compress responses > 1KB
    }),
  )

  // ─── Cross-origin + parsers ────────────────────────────────────────────────
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  // ─── CSRF (double-submit cookie) ───────────────────────────────────────────
  app.use(csrfCookieSetter)
  app.use('/api', csrfProtection)

  // ─── Rate limit (global fallback) ──────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isTest,
  })
  app.use('/api', globalLimiter)

  // ─── Routes ────────────────────────────────────────────────────────────────
  app.use('/api', healthRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/leads', leadRouter)
  app.use('/api/chat', chatRouter)

  // ─── Tail handlers ─────────────────────────────────────────────────────────
  app.use(notFoundHandler)
  installSentryExpressErrorHandler(app)
  app.use(errorHandler)

  registerSocketHandlers(io)

  return { app, server, io }
}
