import mongoose from 'mongoose'
import { env } from '../config/env'
import { logger } from '../config/logger'

export async function connectMongo(): Promise<void> {
  mongoose.set('strictQuery', true)
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 })
    logger.info({ uri: env.MONGODB_URI.replace(/\/\/[^@]+@/, '//***@') }, 'MongoDB connected')
  } catch (err) {
    logger.fatal({ err }, 'MongoDB connection failed')
    process.exit(1)
  }

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'))
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'))
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'))
}
