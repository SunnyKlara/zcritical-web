import pino from 'pino'
import { env, isDev } from './env'

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
        },
      }
    : {}),
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
})
