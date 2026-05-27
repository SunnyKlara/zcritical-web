/**
 * Integration tests — Lead API.
 * Uses supertest against a real Express app + in-memory MongoDB.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createServer } from '../server'
import { LeadModel } from '../models/Lead.model'
import { decryptLeanOne } from '../db/encrypted-fields.plugin'

const PII_FIELDS = ['name', 'email', 'phone', 'message']

let app: Express

beforeAll(() => {
  ;({ app } = createServer())
})

describe('POST /api/leads', () => {
  it('creates a lead with valid data', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({
        name: '张三',
        email: 'zhangsan@example.com',
        message: '想了解批发价格',
      })
      .expect(201)

    expect(res.body).toHaveProperty('ok', true)
    expect(res.body).toHaveProperty('id')

    // Encryption assertion: the on-disk row must NOT hold plaintext PII.
    const raw = await LeadModel.findById(res.body.id).select('+emailHash').lean()
    expect(raw?.email).toMatch(/^v1:/)
    expect(raw?.emailHash).toMatch(/^[0-9a-f]{64}$/)

    // Decryption assertion: the application-facing read returns plaintext.
    const lead = decryptLeanOne(PII_FIELDS, raw)
    expect(lead?.name).toBe('张三')
    expect(lead?.email).toBe('zhangsan@example.com')
    expect(lead?.status).toBe('new')
  })

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({
        name: 'Test',
        email: 'not-an-email',
        message: 'hi',
      })
      .expect(400)

    expect(res.body).toHaveProperty('error', 'Validation failed')
  })

  it('rejects empty name', async () => {
    await request(app)
      .post('/api/leads')
      .send({
        name: '',
        email: 'test@test.com',
        message: 'hi',
      })
      .expect(400)
  })

  it('returns 202 silently on honeypot trigger (no DB write)', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({
        name: 'Bot',
        email: 'bot@spam.com',
        message: 'spam',
        website: 'https://spam.example.com',
      })
      .expect(202)

    expect(res.body).toHaveProperty('ok', true)
    const count = await LeadModel.countDocuments()
    expect(count).toBe(0)
  })

  it('lowercases email automatically', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({
        name: 'Test',
        email: 'UPPER@CASE.COM',
        message: 'hi',
      })
      .expect(201)

    const lead = decryptLeanOne(PII_FIELDS, await LeadModel.findById(res.body.id).lean())
    expect(lead?.email).toBe('upper@case.com')
  })
})

describe('GET /api/leads', () => {
  it('requires admin auth', async () => {
    await request(app).get('/api/leads').expect(401)
  })
})

describe('PATCH /api/leads/:id', () => {
  it('requires admin auth', async () => {
    const lead = await LeadModel.create({
      name: 'Test',
      email: 'test@test.com',
      message: 'hi',
    })
    await request(app).patch(`/api/leads/${lead._id}`).send({ status: 'contacted' }).expect(401)
  })
})
