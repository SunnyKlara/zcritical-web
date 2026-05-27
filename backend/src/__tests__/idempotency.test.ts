/**
 * Tests the idempotency middleware in isolation against an Express app.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import { idempotency } from '../middleware/idempotency.middleware'

let app: express.Express
let counter = 0

beforeAll(() => {
  app = express()
  app.use(express.json())
  app.post('/charge', idempotency({ scope: 'test.charge' }), (req, res) => {
    counter += 1
    res.json({ counter, body: req.body })
  })
})

describe('idempotency middleware', () => {
  it('runs handler once and replays cached response', async () => {
    counter = 0
    const key = 'idem-key-1'

    const a = await request(app)
      .post('/charge')
      .set('Idempotency-Key', key)
      .send({ amount: 100 })
      .expect(200)
    expect(a.body.counter).toBe(1)

    const b = await request(app)
      .post('/charge')
      .set('Idempotency-Key', key)
      .send({ amount: 100 })
      .expect(200)
    // Counter must NOT have advanced — handler reused.
    expect(b.body.counter).toBe(1)
    expect(b.body).toEqual(a.body)
  })

  it('rejects same key with different body', async () => {
    counter = 0
    const key = 'idem-key-2'

    await request(app).post('/charge').set('Idempotency-Key', key).send({ amount: 100 }).expect(200)
    await request(app).post('/charge').set('Idempotency-Key', key).send({ amount: 200 }).expect(422)
  })

  it('runs handler every time when no key supplied', async () => {
    counter = 0
    await request(app).post('/charge').send({ amount: 100 }).expect(200)
    await request(app).post('/charge').send({ amount: 100 }).expect(200)
    expect(counter).toBe(2)
  })

  it('rejects malformed key', async () => {
    await request(app)
      .post('/charge')
      .set('Idempotency-Key', 'has spaces & punctuation!')
      .send({ amount: 1 })
      .expect(400)
  })
})
