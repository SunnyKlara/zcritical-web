import express from 'express'
import http from 'http'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
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
import { registerSocketHandlers } from './socket'
import { initSentry, sentryRequestHandler, installSentryExpressErrorHandler } from './lib/sentry'

export function createServer(): {
  app: express.Express
  server: http.Server
  io: IOServer
} {
  // Idempotent — index.ts calls initSentry() earlier, but call again to
  // guarantee initialization if createServer() is invoked in isolation
  // (e.g. supertest integration tests).
  initSentry()

  const app = express()
  const server = http.createServer(app)
  const io = new IOServer(server, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  })

  app.disable('x-powered-by')
  // Express 4: needed so req.ip honors X-Forwarded-For behind Render / Cloudflare.
  app.set('trust proxy', 1)

  app.use(sentryRequestHandler)

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
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())
  app.use(pinoHttp({ logger }))

  app.use(csrfCookieSetter)
  app.use('/api', csrfProtection)

  const globalLimiter = rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isTest,
  })
  app.use('/api', globalLimiter)

  // Routes
  app.use('/api', healthRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/leads', leadRouter)
  app.use('/api/chat', chatRouter)

  app.use(notFoundHandler)
  installSentryExpressErrorHandler(app)
  app.use(errorHandler)

  registerSocketHandlers(io)

  return { app, server, io }
}
