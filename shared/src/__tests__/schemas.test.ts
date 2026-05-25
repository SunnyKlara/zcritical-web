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
