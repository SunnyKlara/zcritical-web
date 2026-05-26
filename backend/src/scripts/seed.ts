/**
 * Database seed script.
 *
 * Idempotent — running multiple times only creates missing data, never
 * duplicates. Safe to run on production after schema changes.
 *
 * Usage:
 *   pnpm --filter backend seed
 */
import { connectMongo } from '../db/mongoose'
import { ProductModel } from '../models/Product.model'
import { FirmwareModel } from '../models/Firmware.model'
import { seedDefaultAdmin } from '../services/auth.service'
import { logger } from '../config/logger'
import mongoose from 'mongoose'

async function seedProducts(): Promise<void> {
  const slug = 'critical-v1'
  const existing = await ProductModel.findOne({ slug }).lean()
  if (existing) {
    logger.info({ slug }, 'Product already exists, skipping seed')
    return
  }

  await ProductModel.create({
    name: {
      zh: 'Critical 智能风洞模拟器',
      en: 'Critical Smart Wind Tunnel Simulator',
    },
    slug,
    description: {
      zh: '0-340km/h 风速模拟、智能灯效、引擎音效、雾化氛围 — 让每一次踩踏都如同身临赛道。',
      en: '0-340 km/h wind simulation, smart lighting, engine sound, fog effects — ride as if you were on the track.',
    },
    price: 29900, // $299.00
    currency: 'USD',
    variants: [
      {
        sku: 'CRITICAL-V1-OBSIDIAN',
        name: { zh: '曜石黑', en: 'Obsidian Black' },
        stock: 50,
        image: '/images/product-black.jpg',
        weight: 850,
      },
      {
        sku: 'CRITICAL-V1-LUNAR',
        name: { zh: '皓月白', en: 'Lunar White' },
        stock: 30,
        image: '/images/product-white.jpg',
        weight: 850,
      },
    ],
    images: ['/images/hero-1.jpg', '/images/hero-2.jpg', '/images/hero-3.jpg'],
    weight: 850,
    dimensions: { length: 220, width: 99, height: 59 },
    status: 'active',
    featured: true,
  })
  logger.info({ slug }, 'Seeded product')
}

async function seedFirmware(): Promise<void> {
  const version = '1.0.0'
  const existing = await FirmwareModel.findOne({ version }).lean()
  if (existing) {
    logger.info({ version }, 'Firmware already exists, skipping seed')
    return
  }

  await FirmwareModel.create({
    version,
    channel: 'stable',
    releaseNotes: {
      zh:
        '• 首个正式发布版本\n' +
        '• 支持无级风速 (0-340 km/h)\n' +
        '• 14 色 LED 预设 + 8 种动态灯效\n' +
        '• 5 层引擎音效合成\n' +
        '• OTA 自动升级 + 双分区回滚保护',
      en:
        '• First stable release\n' +
        '• Continuous wind speed control (0-340 km/h)\n' +
        '• 14 LED color presets + 8 dynamic effects\n' +
        '• 5-layer engine sound synthesis\n' +
        '• OTA auto-upgrade with dual-partition rollback',
    },
    binaryUrl:
      'https://github.com/SunnyKlara/Zcritical/releases/download/v1.0.0/ridewind-v1.0.0.bin',
    binarySize: 1_540_000,
    // SHA256 placeholder — replace with real hash via Admin /utils/hash endpoint
    binaryHash: 'a'.repeat(64),
    hardwareVersions: ['v1.0'],
    rolloutPercent: 100,
    status: 'published',
    publishedAt: new Date(),
  })
  logger.info({ version }, 'Seeded firmware')
}

async function main(): Promise<void> {
  await connectMongo()
  try {
    await seedDefaultAdmin()
    await seedProducts()
    await seedFirmware()
    logger.info('Seed complete')
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  logger.fatal({ err }, 'Seed failed')
  process.exit(1)
})
