import type { NextFunction, Request, Response } from 'express'
import { logger } from '../config/logger'
import { isProd } from '../config/env'

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err, url: req.url }, 'Unhandled error')
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ error: isProd ? 'Internal server error' : message })
}
