import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { DataRequestModel } from '../models/DataRequest.model'
import { validateBody } from '../middleware/validate.middleware'
import { audit } from '../services/audit.service'
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  cancelSoftDelete,
  collectUserData,
  generateOtp,
  hashOtp,
  scheduleSoftDelete,
} from '../services/gdpr.service'
import { sendDataRequestOtp, notifyDeletionScheduled } from '../services/mailer.service'
import { emailBlindIndex, encryptString, safeEqual } from '../lib/crypto'
import { isTest } from '../config/env'
import { logger } from '../config/logger'

export const accountRouter = Router()

const RequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  kind: z.enum(['export', 'delete']),
})

const VerifySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  kind: z.enum(['export', 'delete']),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
})

const CancelSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
})

/** 3 requests / 5 min / IP — generous for typo retries, tight enough vs scrapers. */
const dataRequestLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: 'Too many data-subject requests, try again later' },
})

const verifyLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
})

// ─── POST /api/account/data-request ─────────────────────────────────────────

/**
 * Step 1: caller asks to export or delete data tied to an email. We email a
 * 6-digit OTP to that address. Subsequent attempts within OTP_TTL just refresh
 * the existing record's OTP — we do NOT confirm or deny that the email is
 * known to us, to avoid email-enumeration.
 */
accountRouter.post(
  '/data-request',
  dataRequestLimiter,
  validateBody(RequestSchema),
  async (req, res, next) => {
    try {
      const { email, kind } = req.body as { email: string; kind: 'export' | 'delete' }
      const otp = generateOtp()
      const otpHash = hashOtp(otp)
      const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS)
      const emailHash = emailBlindIndex('account.email', email)

      await DataRequestModel.findOneAndUpdate(
        { emailHash, kind, status: 'pending' },
        {
          $set: {
            kind,
            email: encryptString(email),
            emailHash,
            otpHash,
            otpExpiresAt,
            attempts: 0,
            status: 'pending',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        },
        { upsert: true, new: true },
      )

      // Fire-and-forget OTP delivery. We always return 202 regardless of
      // delivery success so an attacker can't probe the address.
      void sendDataRequestOtp({ email, otp, kind }).catch((err: unknown) =>
        logger.warn({ err }, 'Data-request OTP send failed'),
      )

      audit({
        action: 'gdpr.request',
        actor: { type: 'visitor' },
        meta: { kind },
        req,
      })

      res.status(202).json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

// ─── POST /api/account/data-request/verify ──────────────────────────────────

accountRouter.post(
  '/data-request/verify',
  verifyLimiter,
  validateBody(VerifySchema),
  async (req, res, next) => {
    try {
      const { email, kind, otp } = req.body as {
        email: string
        kind: 'export' | 'delete'
        otp: string
      }
      const emailHash = emailBlindIndex('account.email', email)

      const requestDoc = await DataRequestModel.findOne({
        emailHash,
        kind,
        status: 'pending',
      }).select('+otpHash +attempts')

      const generic = { error: 'Invalid or expired code' }
      if (!requestDoc) {
        res.status(400).json(generic)
        return
      }

      if (requestDoc.otpExpiresAt && requestDoc.otpExpiresAt.getTime() < Date.now()) {
        requestDoc.status = 'failed'
        await requestDoc.save()
        res.status(400).json(generic)
        return
      }

      const ok =
        typeof requestDoc.otpHash === 'string' && safeEqual(requestDoc.otpHash, hashOtp(otp))
      if (!ok) {
        requestDoc.attempts = (requestDoc.attempts ?? 0) + 1
        if (requestDoc.attempts >= OTP_MAX_ATTEMPTS) {
          requestDoc.status = 'failed'
        }
        await requestDoc.save()
        audit({
          action: 'gdpr.verify.fail',
          actor: { type: 'visitor' },
          meta: { kind, attempts: requestDoc.attempts },
          success: false,
          req,
        })
        res.status(400).json(generic)
        return
      }

      // OTP correct. Burn the OTP so it can't be replayed. We cannot just
      // assign '' because the schema marks otpHash required — instead use
      // an unvalidated $unset.
      await DataRequestModel.updateOne(
        { _id: requestDoc._id },
        { $set: { status: 'verified' }, $unset: { otpHash: '' } },
      )

      if (kind === 'export') {
        const dump = await collectUserData(email)
        await DataRequestModel.updateOne(
          { _id: requestDoc._id },
          { $set: { status: 'completed', completedAt: new Date() } },
        )
        audit({
          action: 'gdpr.export',
          actor: { type: 'visitor' },
          meta: { records: dump.leads.length + dump.orders.length + dump.devices.length },
          req,
        })
        res
          .status(200)
          .setHeader('Content-Disposition', `attachment; filename="critical-export.json"`)
          .json(dump)
        return
      }

      // kind === 'delete'
      const { scheduledAt, affected } = await scheduleSoftDelete(email)
      await DataRequestModel.updateOne(
        { _id: requestDoc._id },
        {
          $set: {
            status: 'verified',
            scheduledDeleteAt: scheduledAt,
          },
        },
      )

      void notifyDeletionScheduled({ email, scheduledAt }).catch((err: unknown) =>
        logger.warn({ err }, 'Deletion-scheduled email failed'),
      )

      audit({
        action: 'gdpr.delete.schedule',
        actor: { type: 'visitor' },
        meta: { affected, scheduledAt },
        req,
      })

      res.json({
        ok: true,
        scheduledAt,
        affected,
      })
    } catch (err) {
      next(err)
    }
  },
)

// ─── POST /api/account/data-request/cancel-deletion ────────────────────────

/**
 * Reverse a pending soft-delete during the 30-day grace window. Requires a
 * fresh OTP (separate `data-request` call with `kind: 'delete'` first to
 * mint one).
 */
accountRouter.post(
  '/data-request/cancel-deletion',
  verifyLimiter,
  validateBody(CancelSchema),
  async (req, res, next) => {
    try {
      const { email, otp } = req.body as { email: string; otp: string }
      const emailHash = emailBlindIndex('account.email', email)

      const requestDoc = await DataRequestModel.findOne({
        emailHash,
        kind: 'delete',
        status: 'pending',
      }).select('+otpHash')

      const generic = { error: 'Invalid or expired code' }
      if (!requestDoc) {
        res.status(400).json(generic)
        return
      }
      if (requestDoc.otpExpiresAt && requestDoc.otpExpiresAt.getTime() < Date.now()) {
        res.status(400).json(generic)
        return
      }
      if (typeof requestDoc.otpHash !== 'string' || !safeEqual(requestDoc.otpHash, hashOtp(otp))) {
        res.status(400).json(generic)
        return
      }

      const { affected } = await cancelSoftDelete(email)
      await DataRequestModel.updateOne(
        { _id: requestDoc._id },
        { $set: { status: 'cancelled', completedAt: new Date() }, $unset: { otpHash: '' } },
      )
      audit({
        action: 'gdpr.delete.cancel',
        actor: { type: 'visitor' },
        meta: { affected },
        req,
      })
      res.json({ ok: true, affected })
    } catch (err) {
      next(err)
    }
  },
)
