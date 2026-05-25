import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { signVisitorSession, verifyVisitorSession } from '../services/token.service'
import { MessageModel } from '../models/Message.model'
import { SessionModel } from '../models/Session.model'
import { requireAdmin } from '../middleware/auth.middleware'
import { logger } from '../config/logger'
import { isTest } from '../config/env'
import { CHAT_HISTORY_PAGE_SIZE, type IssueSessionResponse, UuidSchema } from '@critical/shared'

export const chatRouter = Router()

/** Issue a visitor session token. Used by ChatWidget on first open. */
const sessionLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
})

chatRouter.post('/session', sessionLimiter, (_req, res) => {
  const sessionId = randomUUID()
  const sessionToken = signVisitorSession(sessionId)
  const response: IssueSessionResponse = { sessionId, sessionToken }
  res.json(response)
})

/** Visitor — fetch their own message history. Auth via session token. */
chatRouter.get('/history', async (req, res) => {
  const token =
    (req.query.token as string | undefined) || req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ error: 'Session token required' })
    return
  }
  try {
    const payload = verifyVisitorSession(token)
    const messages = await MessageModel.find({ sessionId: payload.sessionId })
      .sort({ createdAt: 1 })
      .limit(CHAT_HISTORY_PAGE_SIZE)
      .lean()
    res.json({ messages })
  } catch {
    res.status(401).json({ error: 'Invalid session token' })
  }
})

// ─── Admin endpoints ─────────────────────────────────────────────────────────

/** Admin — list active chat sessions. */
chatRouter.get('/admin/sessions', requireAdmin, async (req, res, next) => {
  try {
    const { status, limit = '50' } = req.query as { status?: string; limit?: string }
    const filter: Record<string, unknown> = {}
    if (status === 'open' || status === 'closed') {
      filter.status = status
    }
    const items = await SessionModel.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(Math.min(200, Number(limit) || 50))
      .lean()
    res.json(items)
  } catch (err) {
    next(err)
  }
})

const SessionIdParams = z.object({ sessionId: UuidSchema })

/** Admin — fetch messages for a specific session. */
chatRouter.get('/admin/sessions/:sessionId/messages', requireAdmin, async (req, res, next) => {
  const parsed = SessionIdParams.safeParse(req.params)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid sessionId' })
    return
  }
  try {
    const messages = await MessageModel.find({ sessionId: parsed.data.sessionId })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean()
    res.json({ messages })
  } catch (err) {
    next(err)
  }
})

/** Admin — close a session. */
chatRouter.post('/admin/sessions/:sessionId/close', requireAdmin, async (req, res, next) => {
  const parsed = SessionIdParams.safeParse(req.params)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid sessionId' })
    return
  }
  try {
    const updated = await SessionModel.findOneAndUpdate(
      { sessionId: parsed.data.sessionId },
      { status: 'closed' },
      { new: true },
    )
    if (!updated) {
      res.status(404).json({ error: 'Session not found' })
      return
    }
    logger.info({ sessionId: parsed.data.sessionId }, 'session closed')
    res.json(updated)
  } catch (err) {
    next(err)
  }
})
