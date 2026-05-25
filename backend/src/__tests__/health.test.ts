import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createServer } from '../server'

let app: Express

beforeAll(() => {
  ;({ app } = createServer())
})

describe('Health endpoints', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health').expect(200)
    expect(res.body.status).toBe('ok')
    expect(typeof res.body.uptime).toBe('number')
  })

  it('GET /api/ready returns ready when mongo connected', async () => {
    const res = await request(app).get('/api/ready').expect(200)
    expect(res.body.status).toBe('ready')
    expect(res.body.checks.mongoConnected).toBe(true)
  })

  it('returns 404 for unknown route', async () => {
    await request(app).get('/api/this-does-not-exist').expect(404)
  })
})
