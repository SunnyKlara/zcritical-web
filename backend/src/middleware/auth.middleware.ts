import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../services/token.service'
import type { AccessTokenPayload, UserRole, VisitorSessionPayload } from '@critical/shared'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AccessTokenPayload
      visitor?: VisitorSessionPayload
    }
  }
}

/** Requires a valid admin Access Token in Authorization header. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    req.admin = verifyAccessToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' })
  }
}

/** Requires the admin to have one of the given roles. Use after requireAdmin. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
