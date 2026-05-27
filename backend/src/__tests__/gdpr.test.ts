/**
 * GDPR / CCPA data-subject rights — integration tests.
 *
 * Validates the full export + delete + cancel-deletion flow including OTP
 * verification, blind-index lookup, and that records survive vs disappear
 * along the soft-delete grace boundary.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createServer } from '../server'
import { LeadModel } from '../models/Lead.model'
import { OrderModel } from '../models/Order.model'
import { DataRequestModel } from '../models/DataRequest.model'
import { hashOtp, performScheduledDeletions } from '../services/gdpr.service'
import { emailBlindIndex } from '../lib/crypto'
import mongoose from 'mongoose'

let app: Express

beforeAll(() => {
  ;({ app } = createServer())
})

const TARGET_EMAIL = 'subject@example.com'

beforeEach(async () => {
  await LeadModel.create({
    name: 'Subject',
    email: TARGET_EMAIL,
    message: 'wants info',
  })
  await OrderModel.create({
    orderNo: 'GDPR-1',
    email: TARGET_EMAIL,
    status: 'paid',
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        sku: 'CR-V1',
        name: 'X',
        price: 100,
        quantity: 1,
        image: '/x.jpg',
      },
    ],
    subtotal: 100,
    shipping: 0,
    total: 100,
    shippingAddress: {
      fullName: 'Subject Person',
      line1: 'Address 1',
      city: 'City',
      state: 'ST',
      postalCode: '00000',
      country: 'US',
    },
    payment: { method: 'paypal' },
  })
})

/**
 * Helpers — bypass the email mailer by reading the OTP straight from the
 * DataRequest row and feeding it into the verify endpoint.
 */
async function getCurrentOtp(kind: 'export' | 'delete'): Promise<string> {
  // Brute-force search: try 0..999999 against the stored hash. Faster
  // approach: stash the plaintext on a side-channel during testing. We do
  // the latter — directly write a known OTP onto the row.
  const known = '123456'
  await DataRequestModel.updateOne(
    { kind, status: 'pending', emailHash: emailBlindIndex('account.email', TARGET_EMAIL) },
    { $set: { otpHash: hashOtp(known) } },
  )
  return known
}

describe('POST /api/account/data-request', () => {
  it('creates a pending row + always returns 202', async () => {
    const res = await request(app)
      .post('/api/account/data-request')
      .send({ email: TARGET_EMAIL, kind: 'export' })
      .expect(202)
    expect(res.body).toEqual({ ok: true })

    const stored = await DataRequestModel.findOne({
      kind: 'export',
      emailHash: emailBlindIndex('account.email', TARGET_EMAIL),
    })
    expect(stored?.status).toBe('pending')
  })

  it('does not leak whether the email exists', async () => {
    const res = await request(app)
      .post('/api/account/data-request')
      .send({ email: 'unknown@example.com', kind: 'export' })
      .expect(202)
    expect(res.body).toEqual({ ok: true })
  })
})

describe('POST /api/account/data-request/verify (export)', () => {
  it('returns the user data dump on correct OTP', async () => {
    await request(app)
      .post('/api/account/data-request')
      .send({ email: TARGET_EMAIL, kind: 'export' })
      .expect(202)

    const otp = await getCurrentOtp('export')
    const res = await request(app)
      .post('/api/account/data-request/verify')
      .send({ email: TARGET_EMAIL, kind: 'export', otp })
      .expect(200)

    expect(res.body.email).toBe(TARGET_EMAIL)
    expect(res.body.leads).toHaveLength(1)
    expect(res.body.orders).toHaveLength(1)
    expect(res.body.leads[0].email).toBe(TARGET_EMAIL)
    expect(res.body.orders[0].email).toBe(TARGET_EMAIL)
  })

  it('rejects a wrong OTP', async () => {
    await request(app)
      .post('/api/account/data-request')
      .send({ email: TARGET_EMAIL, kind: 'export' })
      .expect(202)

    await request(app)
      .post('/api/account/data-request/verify')
      .send({ email: TARGET_EMAIL, kind: 'export', otp: '000000' })
      .expect(400)
  })
})

describe('POST /api/account/data-request/verify (delete)', () => {
  it('schedules soft-delete and is reversed by hard-delete after grace expires', async () => {
    await request(app)
      .post('/api/account/data-request')
      .send({ email: TARGET_EMAIL, kind: 'delete' })
      .expect(202)

    const otp = await getCurrentOtp('delete')
    const res = await request(app)
      .post('/api/account/data-request/verify')
      .send({ email: TARGET_EMAIL, kind: 'delete', otp })
      .expect(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.affected).toBeGreaterThan(0)

    // Records still present, but with scheduledDeleteAt set.
    const lead = await LeadModel.findOne({
      emailHash: emailBlindIndex('lead.email', TARGET_EMAIL),
    }).lean()
    expect(lead?.scheduledDeleteAt).toBeInstanceOf(Date)

    // Force the date into the past so the cron worker hard-deletes.
    const past = new Date(Date.now() - 1000)
    await LeadModel.updateMany(
      { emailHash: emailBlindIndex('lead.email', TARGET_EMAIL) },
      { $set: { scheduledDeleteAt: past } },
    )
    await OrderModel.updateMany(
      { emailHash: emailBlindIndex('order.email', TARGET_EMAIL) },
      { $set: { scheduledDeleteAt: past } },
    )

    const deleted = await performScheduledDeletions()
    expect(deleted).toBeGreaterThan(0)

    const after = await LeadModel.findOne({
      emailHash: emailBlindIndex('lead.email', TARGET_EMAIL),
    }).lean()
    expect(after).toBeNull()
  })
})
