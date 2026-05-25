import type { Request } from 'express'
import { AuditLogModel } from '../models/AuditLog.model'
import { logger } from '../config/logger'

export interface AuditInput {
  action: string
  actor?: { type: 'admin' | 'visitor' | 'system'; id?: string; username?: string }
  target?: string
  success?: boolean
  meta?: unknown
  req?: Request
}

/** Fire-and-forget audit logger. Never throws. */
export function audit(input: AuditInput): void {
  const { req, ...rest } = input
  const doc = {
    ...rest,
    ip: req?.ip,
    userAgent: req?.headers['user-agent'],
  }
  AuditLogModel.create(doc).catch((err: unknown) => {
    logger.error({ err, action: input.action }, 'Failed to write audit log')
  })
}
