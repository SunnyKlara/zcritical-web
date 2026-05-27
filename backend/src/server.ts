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
import { openapiRouter } from './routes/openapi.routes'
import { productRouter, adminProductRouter } from './routes/product.routes'
import { orderRouter } from './routes/order.routes'
import { adminOrderRouter } from './routes/admin-order.routes'
import { webhookRouter } from './routes/webhook.routes'
import { firmwareRouter, adminFirmwareRouter } from './routes/firmware.routes'
import { deviceRouter, adminDeviceRouter } from './routes/device.routes'
import { accountRouter } from './routes/account.routes'
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
    maxHttpBufferSize: 1e6,
  })

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(sentryRequestHandler)
  app.use(requestId)

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).id,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error'
        if (res.statusCode >= 400) return 'warn'
        return 'info'
      },
      autoLogging: {
        ignore: (req) => {
          const url = (req as express.Request).originalUrl
          return url === '/api/health' || url === '/api/ready'
        },
      },
    }),
  )

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

  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false
        return compression.filter(req, res)
      },
      threshold: 1024,
    }),
  )

  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))

  // ─── Body parsing — capture raw body for PayPal webhook signature verification ─
  app.use(
    express.json({
      limit: '100kb',
      verify: (req, _res, buf) => {
        if ((req as express.Request).originalUrl === '/api/payments/paypal/webhook') {
          ;(req as express.Request & { rawBody?: Buffer }).rawBody = buf
        }
      },
    }),
  )
  app.use(cookieParser())

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

  // ─── Routes ────────────────────────────────────────────────────────────────
  app.use('/api', healthRouter)
  app.use('/api', openapiRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/leads', leadRouter)
  app.use('/api/chat', chatRouter)
  app.use('/api/products', productRouter)
  app.use('/api/orders', orderRouter)
  app.use('/api/firmware', firmwareRouter)
  app.use('/api/devices', deviceRouter)
  app.use('/api/admin/products', adminProductRouter)
  app.use('/api/admin/orders', adminOrderRouter)
  app.use('/api/admin/firmware', adminFirmwareRouter)
  app.use('/api/admin/devices', adminDeviceRouter)
  app.use('/api/payments', webhookRouter)
  app.use('/api/account', accountRouter)

  app.use(notFoundHandler)
  installSentryExpressErrorHandler(app)
  app.use(errorHandler)

  registerSocketHandlers(io)

  return { app, server, io }
}
