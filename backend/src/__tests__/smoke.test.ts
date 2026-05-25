/**
 * Smoke test — verify the server module wires up without crashing.
 * Integration tests live in auth.test.ts / leads.test.ts / health.test.ts.
 */
import { describe, it, expect } from 'vitest'

describe('backend smoke', () => {
  it('env module loads', async () => {
    const { env } = await import('../config/env')
    expect(env.NODE_ENV).toBeDefined()
    expect(env.PORT).toBeGreaterThan(0)
  })

  it('logger module loads', async () => {
    const { logger } = await import('../config/logger')
    expect(typeof logger.info).toBe('function')
  })

  it('shared schemas import works', async () => {
    const { CreateLeadRequestSchema, LEAD_STATUSES } = await import('@critical/shared')
    expect(LEAD_STATUSES).toContain('new')
    const result = CreateLeadRequestSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      message: 'Hello',
    })
    expect(result.success).toBe(true)
  })

  it('Lead model schema is valid', async () => {
    const { LeadModel } = await import('../models/Lead.model')
    expect(LeadModel.modelName).toBe('Lead')
  })

  it('User model schema is valid', async () => {
    const { UserModel } = await import('../models/User.model')
    expect(UserModel.modelName).toBe('User')
  })

  it('AuditLog model schema is valid', async () => {
    const { AuditLogModel } = await import('../models/AuditLog.model')
    expect(AuditLogModel.modelName).toBe('AuditLog')
  })
})
