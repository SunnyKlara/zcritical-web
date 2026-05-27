// Sentry must be initialized BEFORE any other imports so its automatic
// instrumentation can patch http / express / mongoose on load.
import { initSentry, Sentry } from './lib/sentry'
initSentry()

import mongoose from 'mongoose'
import { env } from './config/env'
import { logger } from './config/logger'
import { connectMongo } from './db/mongoose'
import { createServer } from './server'
import { seedDefaultAdmin } from './services/auth.service'
import { startOrderCleanup, stopOrderCleanup } from './services/order-cleanup.service'
import { startAnomalyDetector, stopAnomalyDetector } from './services/anomaly.service'

const SHUTDOWN_TIMEOUT_MS = 10_000

async function main(): Promise<void> {
  await connectMongo()
  await seedDefaultAdmin()
  startOrderCleanup()
  startAnomalyDetector()
  const { server, io } = createServer()

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API server started')
    logger.info(`Health: http://localhost:${env.PORT}/api/health`)
  })

  // ─── Graceful shutdown ─────────────────────────────────────────────────────
  let shuttingDown = false

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'Shutdown initiated')

    // Hard exit timer — guarantee process dies even if cleanup hangs
    const hardExit = setTimeout(() => {
      logger.error('Shutdown timed out, forcing exit')
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)
    hardExit.unref()

    try {
      // 1. Stop accepting new HTTP connections
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
      logger.info('HTTP server closed')

      // 2. Stop background cleanup
      stopOrderCleanup()
      stopAnomalyDetector()

      // 3. Disconnect Socket.io clients
      io.disconnectSockets(true)
      await new Promise<void>((resolve) => io.close(() => resolve()))
      logger.info('Socket.io closed')

      // 3. Drain Sentry buffer (don't lose late errors)
      await Sentry.flush(2000)

      // 4. Close DB connection
      await mongoose.disconnect()
      logger.info('MongoDB disconnected')

      logger.info('Shutdown complete')
      process.exit(0)
    } catch (err) {
      logger.error({ err }, 'Error during shutdown')
      process.exit(1)
    }
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  // Surface unhandled rejections so they show up in Sentry instead of silent failures
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection')
    Sentry.captureException(reason)
  })
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception')
    Sentry.captureException(err)
    void Sentry.flush(2000).finally(() => process.exit(1))
  })
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal startup error')
  Sentry.captureException(err)
  void Sentry.flush(2000).finally(() => process.exit(1))
})
