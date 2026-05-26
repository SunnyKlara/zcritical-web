import { Router } from 'express'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import {
  FirmwareCheckQuerySchema,
  CreateFirmwareRequestSchema,
  UpdateFirmwareRequestSchema,
  ObjectIdSchema,
  type FirmwareCheckResponse,
} from '@critical/shared'
import { FirmwareModel } from '../models/Firmware.model'
import { validateBody, validateParams } from '../middleware/validate.middleware'
import { requireAdmin } from '../middleware/auth.middleware'
import { audit } from '../services/audit.service'
import { compareSemver, isInRollout } from '../services/firmware.service'

export const firmwareRouter = Router()
export const adminFirmwareRouter = Router()

// ─── Public ──────────────────────────────────────────────────────────────────

/** APP-facing: check for available firmware update. */
firmwareRouter.get('/check', async (req, res, next) => {
  const parsed = FirmwareCheckQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() })
    return
  }

  try {
    const { serialNumber, currentVersion, hardwareVersion, channel } = parsed.data

    // Find latest published firmware for this channel + hardware
    const latest = await FirmwareModel.findOne({
      status: 'published',
      channel,
      hardwareVersions: hardwareVersion,
    })
      .sort({ publishedAt: -1 })
      .lean()

    if (!latest || compareSemver(latest.version, currentVersion) <= 0) {
      const response: FirmwareCheckResponse = { hasUpdate: false }
      res.json(response)
      return
    }

    // Gradual rollout: deterministic by serialNumber hash
    if (!isInRollout(serialNumber, latest.rolloutPercent)) {
      const response: FirmwareCheckResponse = { hasUpdate: false }
      res.json(response)
      return
    }

    const response: FirmwareCheckResponse = {
      hasUpdate: true,
      latestVersion: latest.version,
      downloadUrl: latest.binaryUrl,
      hash: latest.binaryHash,
      size: latest.binarySize,
      releaseNotes: latest.releaseNotes,
    }
    res.json(response)
  } catch (err) {
    next(err)
  }
})

/** Public list of published firmwares (for /firmware page on the website). */
firmwareRouter.get('/list', async (req, res, next) => {
  try {
    const channel = (req.query.channel as string) || 'stable'
    const items = await FirmwareModel.find({
      status: 'published',
      channel,
    })
      .sort({ publishedAt: -1 })
      .limit(100)
      .select('-binaryHash')
      .lean()
    res.json(items)
  } catch (err) {
    next(err)
  }
})

// ─── Admin ───────────────────────────────────────────────────────────────────

adminFirmwareRouter.use(requireAdmin)

const FirmwareIdParams = z.object({ id: ObjectIdSchema })

adminFirmwareRouter.get('/', async (_req, res, next) => {
  try {
    const items = await FirmwareModel.find().sort({ createdAt: -1 }).lean()
    res.json(items)
  } catch (err) {
    next(err)
  }
})

adminFirmwareRouter.post('/', validateBody(CreateFirmwareRequestSchema), async (req, res, next) => {
  try {
    const fw = await FirmwareModel.create(req.body)
    audit({
      action: 'firmware.create',
      actor: { type: 'admin', id: req.admin!.sub, username: req.admin!.username },
      target: fw.version,
      req,
    })
    res.status(201).json(fw)
  } catch (err) {
    next(err)
  }
})

adminFirmwareRouter.patch(
  '/:id',
  validateParams(FirmwareIdParams),
  validateBody(UpdateFirmwareRequestSchema),
  async (req, res, next) => {
    try {
      const fw = await FirmwareModel.findByIdAndUpdate(
        req.params.id,
        req.body as Record<string, unknown>,
        { new: true },
      )
      if (!fw) {
        res.status(404).json({ error: 'Firmware not found' })
        return
      }
      audit({
        action: 'firmware.update',
        actor: { type: 'admin', id: req.admin!.sub, username: req.admin!.username },
        target: fw.version,
        req,
      })
      res.json(fw)
    } catch (err) {
      next(err)
    }
  },
)

adminFirmwareRouter.post(
  '/:id/publish',
  validateParams(FirmwareIdParams),
  async (req, res, next) => {
    try {
      const fw = await FirmwareModel.findByIdAndUpdate(
        req.params.id,
        { status: 'published', publishedAt: new Date() },
        { new: true },
      )
      if (!fw) {
        res.status(404).json({ error: 'Firmware not found' })
        return
      }
      audit({
        action: 'firmware.publish',
        actor: { type: 'admin', id: req.admin!.sub, username: req.admin!.username },
        target: fw.version,
        req,
      })
      res.json(fw)
    } catch (err) {
      next(err)
    }
  },
)

adminFirmwareRouter.delete('/:id', validateParams(FirmwareIdParams), async (req, res, next) => {
  try {
    const fw = await FirmwareModel.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true },
    )
    if (!fw) {
      res.status(404).json({ error: 'Firmware not found' })
      return
    }
    audit({
      action: 'firmware.archive',
      actor: { type: 'admin', id: req.admin!.sub, username: req.admin!.username },
      target: fw.version,
      req,
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/** Helper for admins / CI to compute a binary's SHA256 for the binaryHash field. */
const HashRequestSchema = z.object({ url: z.string().url() })
adminFirmwareRouter.post('/utils/hash', validateBody(HashRequestSchema), async (req, res, next) => {
  try {
    const { url } = req.body as { url: string }
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) {
      res.status(502).json({ error: `Fetch failed: ${response.status}` })
      return
    }
    const buf = Buffer.from(await response.arrayBuffer())
    const hash = createHash('sha256').update(buf).digest('hex')
    res.json({ hash, size: buf.length })
  } catch (err) {
    next(err)
  }
})
