/**
 * Integration tests — Auth API.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { authenticator } from 'otplib'
import { createServer } from '../server'
import { UserModel } from '../models/User.model'
import { hashPassword, MAX_FAILED_ATTEMPTS } from '../services/auth.service'
import {
  encryptTotpSecret,
  generateBackupCodes,
  hashBackupCode,
} from '../services/two-factor.service'

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
  it('logs in with valid credentials (no 2FA)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)

    expect(res.body).toHaveProperty('accessToken')
    expect(res.body.user.username).toBe(TEST_USERNAME)
    expect(res.body.user.role).toBe('admin')
    expect(res.body.requiresTwoFactor).not.toBe(true)
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

  it('locks account after repeated failures', async () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ username: TEST_USERNAME, password: 'wrong' })
        .expect(401)
    }
    // Final failure crosses the threshold and returns 423.
    await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: 'wrong' })
      .expect(423)
    // Even the correct password is rejected with 423 while locked.
    await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(423)
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

describe('2FA enrollment + login', () => {
  it('enrolls and returns backup codes', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)
    const accessToken: string = loginRes.body.accessToken

    const setupRes = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    const secret: string = setupRes.body.secret
    expect(setupRes.body.otpauthUrl).toMatch(/^otpauth:\/\/totp\//u)

    const enableCode = authenticator.generate(secret)
    const enableRes = await request(app)
      .post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: enableCode })
      .expect(200)
    expect(enableRes.body.enabled).toBe(true)
    expect(enableRes.body.backupCodes).toHaveLength(10)

    // Subsequent login should now ask for a second factor.
    const step1 = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)
    expect(step1.body.requiresTwoFactor).toBe(true)
    expect(typeof step1.body.twoFactorToken).toBe('string')
    expect(step1.body).not.toHaveProperty('accessToken')
  })

  it('rejects wrong TOTP at verify step', async () => {
    // Pre-seed an enrolled user without going through HTTP for speed.
    const secret = authenticator.generateSecret()
    await UserModel.updateOne(
      { username: TEST_USERNAME },
      {
        $set: {
          twoFactorEnabled: true,
          twoFactorSecret: encryptTotpSecret(secret),
        },
      },
    )

    const step1 = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)
    expect(step1.body.requiresTwoFactor).toBe(true)

    await request(app)
      .post('/api/auth/2fa/verify')
      .send({ twoFactorToken: step1.body.twoFactorToken, code: '000000' })
      .expect(401)
  })

  it('accepts a one-time backup code at verify step', async () => {
    const secret = authenticator.generateSecret()
    const codes = generateBackupCodes(10)
    await UserModel.updateOne(
      { username: TEST_USERNAME },
      {
        $set: {
          twoFactorEnabled: true,
          twoFactorSecret: encryptTotpSecret(secret),
          twoFactorBackupCodes: codes.map((c) => ({ hash: hashBackupCode(c), usedAt: null })),
        },
      },
    )

    const step1 = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)

    const usedCode = codes[0]
    const ok = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ twoFactorToken: step1.body.twoFactorToken, backupCode: usedCode })
      .expect(200)
    expect(ok.body).toHaveProperty('accessToken')

    // Reusing the same backup code must fail.
    const step1b = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)
    await request(app)
      .post('/api/auth/2fa/verify')
      .send({ twoFactorToken: step1b.body.twoFactorToken, backupCode: usedCode })
      .expect(401)
  })
})
