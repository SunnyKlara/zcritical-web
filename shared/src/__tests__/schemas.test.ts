/**
 * Tests for shared Zod schemas.
 * Verifies the public contract (what frontend/backend consume) doesn't drift.
 */
import { describe, it, expect } from 'vitest'
import {
  CreateLeadRequestSchema,
  UpdateLeadRequestSchema,
  LEAD_STATUSES,
  ObjectIdSchema,
  EmailSchema,
  ORDER_STATUSES,
  FIRMWARE_CHANNELS,
} from '../index'

describe('shared/schemas/lead', () => {
  it('accepts a valid lead submission', () => {
    const result = CreateLeadRequestSchema.safeParse({
      name: '张三',
      email: 'zhangsan@example.com',
      message: '想了解 Critical 批发价格',
    })
    expect(result.success).toBe(true)
  })

  it('lowercases email automatically', () => {
    const result = CreateLeadRequestSchema.parse({
      name: 'Test',
      email: 'TEST@EXAMPLE.COM',
      message: 'hi',
    })
    expect(result.email).toBe('test@example.com')
  })

  it('rejects empty name', () => {
    const result = CreateLeadRequestSchema.safeParse({
      name: '',
      email: 'test@test.com',
      message: 'hi',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = CreateLeadRequestSchema.safeParse({
      name: 'Test',
      email: 'not-an-email',
      message: 'hi',
    })
    expect(result.success).toBe(false)
  })

  it('rejects message exceeding 2000 chars', () => {
    const result = CreateLeadRequestSchema.safeParse({
      name: 'Test',
      email: 'test@test.com',
      message: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts honeypot field (route handles it)', () => {
    // The honeypot is a Zod-level pass-through; the route returns 202 silently.
    const result = CreateLeadRequestSchema.safeParse({
      name: 'Bot',
      email: 'bot@test.com',
      message: 'spam',
      website: 'https://spam.example.com',
    })
    expect(result.success).toBe(true)
  })

  it('UpdateLeadRequestSchema accepts valid status', () => {
    const result = UpdateLeadRequestSchema.safeParse({ status: 'contacted' })
    expect(result.success).toBe(true)
  })

  it('UpdateLeadRequestSchema rejects unknown status', () => {
    const result = UpdateLeadRequestSchema.safeParse({ status: 'nonsense' })
    expect(result.success).toBe(false)
  })
})

describe('shared/schemas/common', () => {
  it('ObjectIdSchema accepts valid 24-char hex', () => {
    const result = ObjectIdSchema.safeParse('507f1f77bcf86cd799439011')
    expect(result.success).toBe(true)
  })

  it('ObjectIdSchema rejects invalid string', () => {
    const result = ObjectIdSchema.safeParse('not-an-objectid')
    expect(result.success).toBe(false)
  })

  it('EmailSchema trims and lowercases', () => {
    const result = EmailSchema.parse('  USER@DOMAIN.COM  ')
    expect(result).toBe('user@domain.com')
  })
})

describe('shared/constants', () => {
  it('LEAD_STATUSES contains expected values', () => {
    expect(LEAD_STATUSES).toEqual(['new', 'contacted', 'qualified', 'won', 'lost'])
  })

  it('ORDER_STATUSES contains expected lifecycle', () => {
    expect(ORDER_STATUSES).toContain('pending_payment')
    expect(ORDER_STATUSES).toContain('paid')
    expect(ORDER_STATUSES).toContain('refunded')
  })

  it('FIRMWARE_CHANNELS has 3 channels', () => {
    expect(FIRMWARE_CHANNELS).toEqual(['stable', 'beta', 'dev'])
  })
})

describe('shared/schemas/auth', () => {
  // Lazy import so failures here don't shadow the lead/common suites.

  it('LoginRequestSchema accepts valid credentials', async () => {
    const { LoginRequestSchema } = await import('../schemas/auth.schema')
    const r = LoginRequestSchema.safeParse({ username: 'admin', password: 'pw1234' })
    expect(r.success).toBe(true)
  })

  it('LoginRequestSchema rejects empty username', async () => {
    const { LoginRequestSchema } = await import('../schemas/auth.schema')
    const r = LoginRequestSchema.safeParse({ username: '', password: 'pw' })
    expect(r.success).toBe(false)
  })

  it('LoginResponseSchema parses authenticated branch', async () => {
    const { LoginResponseSchema } = await import('../schemas/auth.schema')
    const r = LoginResponseSchema.safeParse({
      status: 'authenticated',
      accessToken: 'jwt.value.here',
      user: {
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        disabled: false,
      },
    })
    expect(r.success).toBe(true)
  })

  it('LoginResponseSchema parses mfa_required branch', async () => {
    const { LoginResponseSchema } = await import('../schemas/auth.schema')
    const r = LoginResponseSchema.safeParse({
      status: 'mfa_required',
      mfaToken: 'opaque.token',
    })
    expect(r.success).toBe(true)
  })

  it('LoginResponseSchema rejects unknown status', async () => {
    const { LoginResponseSchema } = await import('../schemas/auth.schema')
    const r = LoginResponseSchema.safeParse({ status: 'unknown' })
    expect(r.success).toBe(false)
  })

  describe('Verify2FARequestSchema', () => {
    it('accepts code only', async () => {
      const { Verify2FARequestSchema } = await import('../schemas/auth.schema')
      const r = Verify2FARequestSchema.safeParse({ mfaToken: 't', code: '123456' })
      expect(r.success).toBe(true)
    })

    it('accepts recoveryCode only', async () => {
      const { Verify2FARequestSchema } = await import('../schemas/auth.schema')
      const r = Verify2FARequestSchema.safeParse({
        mfaToken: 't',
        recoveryCode: 'AAAA-BBBB-CCCC',
      })
      expect(r.success).toBe(true)
    })

    it('rejects when both code and recoveryCode are present', async () => {
      const { Verify2FARequestSchema } = await import('../schemas/auth.schema')
      const r = Verify2FARequestSchema.safeParse({
        mfaToken: 't',
        code: '123456',
        recoveryCode: 'AAAA-BBBB-CCCC',
      })
      expect(r.success).toBe(false)
    })

    it('rejects when neither code nor recoveryCode is present', async () => {
      const { Verify2FARequestSchema } = await import('../schemas/auth.schema')
      const r = Verify2FARequestSchema.safeParse({ mfaToken: 't' })
      expect(r.success).toBe(false)
    })

    it('rejects malformed code (not 6 digits)', async () => {
      const { Verify2FARequestSchema } = await import('../schemas/auth.schema')
      const r = Verify2FARequestSchema.safeParse({ mfaToken: 't', code: '12345' })
      expect(r.success).toBe(false)
    })

    it('rejects malformed recovery code', async () => {
      const { Verify2FARequestSchema } = await import('../schemas/auth.schema')
      const r = Verify2FARequestSchema.safeParse({
        mfaToken: 't',
        recoveryCode: 'invalid',
      })
      expect(r.success).toBe(false)
    })
  })

  describe('Disable2FARequestSchema', () => {
    it('accepts password + code', async () => {
      const { Disable2FARequestSchema } = await import('../schemas/auth.schema')
      const r = Disable2FARequestSchema.safeParse({ password: 'pw', code: '123456' })
      expect(r.success).toBe(true)
    })

    it('accepts password + recoveryCode', async () => {
      const { Disable2FARequestSchema } = await import('../schemas/auth.schema')
      const r = Disable2FARequestSchema.safeParse({
        password: 'pw',
        recoveryCode: 'AAAA-BBBB-CCCC',
      })
      expect(r.success).toBe(true)
    })

    it('rejects when neither factor is provided', async () => {
      const { Disable2FARequestSchema } = await import('../schemas/auth.schema')
      const r = Disable2FARequestSchema.safeParse({ password: 'pw' })
      expect(r.success).toBe(false)
    })

    it('rejects when both factors are provided', async () => {
      const { Disable2FARequestSchema } = await import('../schemas/auth.schema')
      const r = Disable2FARequestSchema.safeParse({
        password: 'pw',
        code: '123456',
        recoveryCode: 'AAAA-BBBB-CCCC',
      })
      expect(r.success).toBe(false)
    })
  })

  it('VerifySetup2FAResponseSchema enforces exactly 8 codes', async () => {
    const { VerifySetup2FAResponseSchema } = await import('../schemas/auth.schema')
    const r = VerifySetup2FAResponseSchema.safeParse({
      recoveryCodes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    })
    expect(r.success).toBe(true)

    const tooFew = VerifySetup2FAResponseSchema.safeParse({ recoveryCodes: ['a'] })
    expect(tooFew.success).toBe(false)
  })

  it('MfaTokenPayloadSchema rejects non-mfa purpose', async () => {
    const { MfaTokenPayloadSchema } = await import('../schemas/auth.schema')
    const r = MfaTokenPayloadSchema.safeParse({ sub: 'u', jti: 'j', purpose: 'access' })
    expect(r.success).toBe(false)
  })
})
