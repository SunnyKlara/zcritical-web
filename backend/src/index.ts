// Sentry must be initialized BEFORE any other imports so its automatic
// instrumentation can patch http / express / mongoose on load.
import { initSentry, Sentry } from './lib/sentry'
initSentry()

import { env } from './config/env'
import { logger } from './config/logger'
import { connectMongo } from './db/mongoose'
import { createServer } from './server'
import { seedDefaultAdmin } from './services/auth.service'

async function main(): Promise<void> {
  await connectMongo()
  await seedDefaultAdmin()
  const { server } = createServer()
  server.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`)
    logger.info(`Health: http://localhost:${env.PORT}/api/health`)
    logger.info(`Ready: http://localhost:${env.PORT}/api/ready`)
  })

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down')
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal startup error')
  Sentry.captureException(err)
  void Sentry.flush(2000).finally(() => process.exit(1))
})
