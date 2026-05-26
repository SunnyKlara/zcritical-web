import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import {
  ActivateDeviceRequestSchema,
  DeviceHeartbeatRequestSchema,
} from '@critical/shared'
import { DeviceModel } from '../models/Device.model'
import { OrderModel } from '../models/Order.model'
import { validateBody } from '../middleware/validate.middleware'
import { requireAdmin } from '../middleware/auth.middleware'
import { audit } from '../services/audit.service'
import { logger } from '../config/logger'
import { isTest } from '../config/env'

export const deviceRouter = Router()
export const adminDeviceRouter = Router()

// ─── Public ──────────────────────────────────────────────────────────────────

const activateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
})

deviceRouter.post(
  '/activate',
  activateLimiter,
  validateBody(ActivateDeviceRequestSchema),
  async (req, res, next) => {
    try {
      const { serialNumber, email, hardwareVersion, firmwareVersion, appVersion } = req.body as {
        serialNumber: string
        email: string
        hardwareVersion: string
        firmwareVersion: string
        appVersion?: string
      }

      // Try to link to an order by email (optional — gray-market devices have none)
      const linkedOrder = await OrderModel.findOne({
        email,
        status: { $in: ['paid', 'shipped', 'delivered'] },
      }).lean()

      const now = new Date()
      const device = await DeviceModel.findOneAndUpdate(
        { serialNumber },
        {
          $set: {
            email,
            hardwareVersion,
            firmwareVersion,
            appVersion,
            lastSeenAt: now,
            ...(linkedOrder ? { orderId: linkedOrder._id } : {}),
          },
          $setOnInsert: {
            serialNumber,
            activatedAt: now,
          },
        },
        { upsert: true, new: true },
      )

      audit({
        action: 'device.activate',
        actor: { type: 'visitor' },
        target: serialNumber,
        meta: { linkedOrderNo: linkedOrder?.orderNo },
        req,
      })

      res.status(201).json({
        serialNumber: device.serialNumber,
        activatedAt: device.activatedAt,
        linkedOrder: linkedOrder ? { orderNo: linkedOrder.orderNo } : null,
      })
    } catch (err) {
      next(err)
    }
  },
)

const heartbeatLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
})

deviceRouter.post(
  '/heartbeat',
  heartbeatLimiter,
  validateBody(DeviceHeartbeatRequestSchema),
  async (req, res, next) => {
    try {
      const { serialNumber, firmwareVersion, appVersion } = req.body as {
        serialNumber: string
        firmwareVersion: string
        appVersion?: string
      }

      const device = await DeviceModel.findOneAndUpdate(
        { serialNumber },
        {
          $set: {
            firmwareVersion,
            appVersion,
            lastSeenAt: new Date(),
          },
        },
        { new: true },
      )

      if (!device) {
        // Unactivated device pinging — soft 404 (don't throw)
        logger.warn({ serialNumber }, 'Heartbeat from unactivated device')
        res.status(404).json({ error: 'Device not activated' })
        return
      }

      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

const SerialQuerySchema = z.object({
  email: z.string().email(),
})

deviceRouter.get('/:serialNumber', async (req, res, next) => {
  try {
    const parsed = SerialQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'email query parameter required' })
      return
    }
    const device = await DeviceModel.findOne({
      serialNumber: req.params.serialNumber,
      email: parsed.data.email,
    }).lean()

    if (!device) {
      res.status(404).json({ error: 'Device not found' })
      return
    }

    // Don't leak orderId or internal metadata to public lookup
    res.json({
      serialNumber: device.serialNumber,
      hardwareVersion: device.hardwareVersion,
      firmwareVersion: device.firmwareVersion,
      activatedAt: device.activatedAt,
      lastSeenAt: device.lastSeenAt,
    })
  } catch (err) {
    next(err)
  }
})

// ─── Admin ───────────────────────────────────────────────────────────────────

adminDeviceRouter.use(requireAdmin)

adminDeviceRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(500, Number(req.query.limit) || 100)
    const items = await DeviceModel.find()
      .sort({ lastSeenAt: -1 })
      .limit(limit)
      .lean()
    res.json(items)
  } catch (err) {
    next(err)
  }
})

adminDeviceRouter.get('/:serialNumber', async (req, res, next) => {
  try {
    const device = await DeviceModel.findOne({ serialNumber: req.params.serialNumber }).lean()
    if (!device) {
      res.status(404).json({ error: 'Device not found' })
      return
    }
    res.json(device)
  } catch (err) {
    next(err)
  }
})
