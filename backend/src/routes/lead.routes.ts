import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import {
  CreateLeadRequestSchema,
  UpdateLeadRequestSchema,
  ObjectIdSchema,
  LEAD_STATUSES,
} from '@critical/shared'
import { LeadModel } from '../models/Lead.model'
import { decryptLean } from '../db/encrypted-fields.plugin'
import { validateBody, validateParams } from '../middleware/validate.middleware'
import { requireAdmin } from '../middleware/auth.middleware'
import { audit } from '../services/audit.service'
import { notifyNewLead } from '../services/mailer.service'
import { logger } from '../config/logger'
import { isTest } from '../config/env'

export const leadRouter = Router()

const leadSubmitLimiter = rateLimit({
  windowMs: 60_000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many submissions, please try again later' },
  // Disable in test env so integration tests can run unimpeded
  skip: () => isTest,
})

/** Public — accept a lead submission. */
leadRouter.post(
  '/',
  leadSubmitLimiter,
  validateBody(CreateLeadRequestSchema),
  async (req, res, next) => {
    const body = req.body as {
      name: string
      email: string
      company?: string
      phone?: string
      message: string
      source?: string
      locale?: string
      website?: string
    }

    // Honeypot: bots frequently fill hidden fields — silently pretend success.
    if (body.website) {
      res.status(202).json({ ok: true })
      return
    }

    try {
      const lead = await LeadModel.create({
        ...body,
        website: undefined,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })
      audit({
        action: 'lead.create',
        actor: { type: 'visitor' },
        target: String(lead._id),
        req,
      })
      // Fire-and-forget email notification.
      notifyNewLead(lead).catch((err: unknown) => logger.error({ err }, 'notifyNewLead failed'))
      res.status(201).json({ ok: true, id: lead._id })
    } catch (err) {
      next(err)
    }
  },
)

const LeadIdParams = z.object({ id: ObjectIdSchema })

/** Admin — list leads. */
leadRouter.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { status, limit = '100' } = req.query as { status?: string; limit?: string }
    const filter: Record<string, unknown> = {}
    // Whitelist status values to prevent NoSQL injection via query params.
    if (
      status &&
      typeof status === 'string' &&
      LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])
    ) {
      filter.status = status
    }
    const items = await LeadModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(500, Number(limit) || 100))
      .lean()
    // `.lean()` bypasses post('init') so encrypted fields stay as ciphertext.
    // Decrypt in-place before returning.
    decryptLean(['name', 'email', 'phone', 'message'], items)
    res.json(items)
  } catch (err) {
    next(err)
  }
})

/** Admin — update status / notes. */
leadRouter.patch(
  '/:id',
  requireAdmin,
  validateParams(LeadIdParams),
  validateBody(UpdateLeadRequestSchema),
  async (req, res, next) => {
    try {
      const updated = await LeadModel.findByIdAndUpdate(
        req.params.id,
        req.body as Record<string, unknown>,
        { new: true },
      )
      if (!updated) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      audit({
        action: 'lead.update',
        actor: { type: 'admin', id: req.admin!.sub, username: req.admin!.username },
        target: String(updated._id),
        req,
      })
      res.json(updated)
    } catch (err) {
      next(err)
    }
  },
)
