import type { NextFunction, Request, Response } from 'express'
import { logger } from '../config/logger'
import { isProd } from '../config/env'

/** Custom error class with machine-readable code + HTTP status. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, url: req.url, requestId: req.id }, err.message)
    }
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
      requestId: req.id,
    })
    return
  }

  logger.error({ err, url: req.url, requestId: req.id }, 'Unhandled error')
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({
    error: isProd ? 'Internal server error' : message,
    code: 'INTERNAL_ERROR',
    requestId: req.id,
  })
}
