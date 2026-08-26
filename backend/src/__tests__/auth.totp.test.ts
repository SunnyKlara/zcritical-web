/**
 * Integration tests — Admin 2FA TOTP.
 *
 * Covers:
 *   1. Setup → verify-setup → activated → recovery codes returned
 *   2. Login on a 2FA-enabled account returns mfa_required (no accessToken yet)
 *   3. /verify-2fa with valid TOTP completes login
 *   4. /verify-2fa with bad code returns 401 + attemptsRemaining
 *   5. /verify-2fa with recovery code consumes it (one-time use)
 *   6. /2fa/disable requires password + valid second factor
 *   7. Replay protection — used recovery code can't be used again
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { TOTP, Secret } from 'otpauth'
import { createServer } from '../server'
import { UserModel } from '../models/User.model'
import { hashPassword } from '../services/auth.service'

let app: Express

beforeAll(() => {
  ;({ app } = createServer())
})

const TEST_USERNAME = 'totpadmin'
const TEST_PASSWORD = 'totp-password-123'

beforeEach(async () => {
  await UserModel.create({
    username: TEST_USERNAME,
    email: 'totpadmin@zcritical.co',
    passwordHash: await hashPassword(TEST_PASSWORD),
    role: 'admin',
    displayName: 'TOTP Admin',
  })
})

/** Mirror the server's TOTP config to compute valid codes. */
function computeTotp(secretBase32: string): string {
  return new TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  }).generate()
}

async function loginGetAccessToken(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
    .expect(200)
  expect(res.body.status).toBe('authenticated')
  return res.body.accessToken
}

describe('2FA setup → verify-setup → activated', () => {
  it('returns secret + uri + qr at /setup', async () => {
    const accessToken = await loginGetAccessToken()
    const res = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.secret).toMatch(/^[A-Z2-7]+$/) // Base32
    expect(res.body.uri).toMatch(/^otpauth:\/\/totp\/Critical:/)
    expect(res.body.qr).toMatch(/^data:image\/png;base64,/)
  })

  it('verify-setup with correct code activates 2FA + returns recovery codes', async () => {
    const accessToken = await loginGetAccessToken()
    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    const code = computeTotp(setup.body.secret)
    const verify = await request(app)
      .post('/api/auth/2fa/verify-setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code })
      .expect(200)

    expect(verify.body.recoveryCodes).toHaveLength(8)
    for (const rc of verify.body.recoveryCodes) {
      expect(rc).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    }

    const me = await UserModel.findOne({ username: TEST_USERNAME }).select(
      '+totpSecret +totpRecoveryCodeHashes',
    )
    expect(me?.totpEnabled).toBe(true)
    expect(me?.totpSecret).toBe(setup.body.secret)
    expect(me?.totpRecoveryCodeHashes).toHaveLength(8)
  })

  it('verify-setup rejects wrong code', async () => {
    const accessToken = await loginGetAccessToken()
    await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    await request(app)
      .post('/api/auth/2fa/verify-setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '000000' })
      .expect(401)
  })

  it('cannot setup again while 2FA is enabled', async () => {
    const accessToken = await loginGetAccessToken()
    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    await request(app)
      .post('/api/auth/2fa/verify-setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: computeTotp(setup.body.secret) })
      .expect(200)

    await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409)
  })
})

describe('Login on 2FA-enabled account', () => {
  /** Helper: enable 2FA and return the secret + initial recovery codes. */
  async function enable2FA(): Promise<{ secret: string; recoveryCodes: string[] }> {
    const accessToken = await loginGetAccessToken()
    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    const verify = await request(app)
      .post('/api/auth/2fa/verify-setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: computeTotp(setup.body.secret) })
      .expect(200)
    return { secret: setup.body.secret, recoveryCodes: verify.body.recoveryCodes }
  }

  it('returns mfa_required (no accessToken / cookie) on first step', async () => {
    await enable2FA()
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)

    expect(res.body.status).toBe('mfa_required')
    expect(res.body.mfaToken).toBeTypeOf('string')
    expect(res.body.accessToken).toBeUndefined()
    const cookies = (res.headers['set-cookie'] as unknown as string[] | undefined) ?? []
    expect(cookies.some((c) => c.includes('critical_rt='))).toBe(false)
  })

  it('verify-2fa with correct code completes login', async () => {
    const { secret } = await enable2FA()
    const step1 = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)

    const step2 = await request(app)
      .post('/api/auth/verify-2fa')
      .send({ mfaToken: step1.body.mfaToken, code: computeTotp(secret) })
      .expect(200)

    expect(step2.body.status).toBe('authenticated')
    expect(step2.body.accessToken).toBeTypeOf('string')
    expect(step2.body.user.totpEnabled).toBe(true)
    const cookies = step2.headers['set-cookie'] as unknown as string[]
    expect(cookies.some((c) => c.includes('critical_rt='))).toBe(true)
  })

  it('verify-2fa with bad code returns 401 + attemptsRemaining', async () => {
    await enable2FA()
    const step1 = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)

    const res = await request(app)
      .post('/api/auth/verify-2fa')
      .send({ mfaToken: step1.body.mfaToken, code: '000000' })
      .expect(401)

    expect(res.body.error).toMatch(/Invalid 2FA/i)
    expect(res.body.attemptsRemaining).toBe(4)
  })

  it('recovery code logs in and is consumed (one-time use)', async () => {
    const { recoveryCodes } = await enable2FA()
    const recovery = recoveryCodes[0]!

    // First use — succeeds.
    const step1a = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)
    const ok = await request(app)
      .post('/api/auth/verify-2fa')
      .send({ mfaToken: step1a.body.mfaToken, recoveryCode: recovery })
      .expect(200)
    expect(ok.body.status).toBe('authenticated')

    // Second use — same recovery code now invalid.
    const step1b = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)
    await request(app)
      .post('/api/auth/verify-2fa')
      .send({ mfaToken: step1b.body.mfaToken, recoveryCode: recovery })
      .expect(401)
  })
})

describe('2FA disable', () => {
  async function enable2FAGetTokens(): Promise<{
    secret: string
    /** access token issued AFTER 2FA already enabled — via verify-2fa flow. */
    accessToken: string
  }> {
    // First, get a pre-2FA access token to call /setup.
    const preToken = await loginGetAccessToken()
    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${preToken}`)
      .expect(200)
    await request(app)
      .post('/api/auth/2fa/verify-setup')
      .set('Authorization', `Bearer ${preToken}`)
      .send({ code: computeTotp(setup.body.secret) })
      .expect(200)

    // Now do a fresh login through the 2FA flow to get a post-2FA access token.
    const step1 = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })
      .expect(200)
    expect(step1.body.status).toBe('mfa_required')
    const step2 = await request(app)
      .post('/api/auth/verify-2fa')
      .send({ mfaToken: step1.body.mfaToken, code: computeTotp(setup.body.secret) })
      .expect(200)

    return { secret: setup.body.secret, accessToken: step2.body.accessToken }
  }

  it('requires password + valid TOTP', async () => {
    const { secret, accessToken } = await enable2FAGetTokens()

    await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: TEST_PASSWORD, code: computeTotp(secret) })
      .expect(200)

    const me = await UserModel.findOne({ username: TEST_USERNAME }).select(
      '+totpSecret +totpRecoveryCodeHashes',
    )
    expect(me?.totpEnabled).toBe(false)
    expect(me?.totpSecret).toBe(null)
    expect(me?.totpRecoveryCodeHashes).toHaveLength(0)
  })

  it('rejects disable with wrong password', async () => {
    const { secret, accessToken } = await enable2FAGetTokens()

    await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'wrong-password', code: computeTotp(secret) })
      .expect(401)
  })

  it('rejects disable with wrong TOTP', async () => {
    const { accessToken } = await enable2FAGetTokens()

    await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: TEST_PASSWORD, code: '000000' })
      .expect(401)
  })
})
