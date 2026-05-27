/**
 * Integration tests — Auth API.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createServer } from '../server'
import { UserModel } from '../models/User.model'
import { hashPassword } from '../services/auth.service'

let app: Express

beforeAll(() => {
  ;({ app } = createServer())
})

const TEST_USERNAME = 'testadmin'
const TEST_PASSWORD = 'test-password-123'

beforeEach(async () => {
  // Seed a known admin user
  await UserModel.create({
    username: TEST_USERNAME,
    email: 'testadmin@zcritical.co',
    passwordHash: await hashPassword(TEST_PASSWORD),
    role: 'admin',
    displayName: 'Test Admin',
  })
})

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)

    expect(res.body).toHaveProperty('accessToken')
    expect(res.body.user.username).toBe(TEST_USERNAME)
    expect(res.body.user.role).toBe('admin')
    // Refresh token should be set as httpOnly cookie
    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies.some((c) => c.includes('critical_rt='))).toBe(true)
  })

  it('rejects wrong password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: 'wrong' })
      .expect(401)
  })

  it('rejects unknown username', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost', password: TEST_PASSWORD })
      .expect(401)
  })

  it('rejects malformed body', async () => {
    await request(app).post('/api/auth/login').send({}).expect(400)
  })
})

describe('GET /api/auth/me', () => {
  it('returns user when authenticated', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200)

    expect(meRes.body.user.username).toBe(TEST_USERNAME)
  })

  it('returns 401 without token', async () => {
    await request(app).get('/api/auth/me').expect(401)
  })

  it('returns 401 with invalid token', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401)
  })
})

describe('Admin can list leads after login', () => {
  it('uses Bearer token to list leads', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })

    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
  })
})
