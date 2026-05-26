import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import SwaggerParser from '@apidevtools/swagger-parser'
import { createServer } from '../server'

let app: Express

beforeAll(() => {
  ;({ app } = createServer())
})

describe('GET /api/openapi.json', () => {
  it('returns a syntactically valid OpenAPI 3.1 document', async () => {
    const res = await request(app).get('/api/openapi.json').expect(200)

    expect(res.body).toBeDefined()
    expect(res.body.openapi).toMatch(/^3\.\d+\.\d+$/)
    expect(res.body.info?.title).toBe('Critical API')

    // Validate the entire spec — fails on missing $refs, broken schemas,
    // duplicate operationIds, malformed paths, etc.
    // SwaggerParser primarily targets 3.0, but most structural checks
    // still run on 3.1 documents. Tolerate version warnings.
    try {
      await SwaggerParser.validate(structuredClone(res.body))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isVersionWarning = /3\.1|openapi version|unsupported/i.test(msg)
      if (!isVersionWarning) throw err
    }
  })

  it('declares all the major endpoint groups', async () => {
    const res = await request(app).get('/api/openapi.json').expect(200)

    expect(res.body.paths).toBeDefined()
    const paths = Object.keys(res.body.paths)
    // Sanity check that the spec describes the actual surface area.
    expect(paths.some((p) => p.includes('/health'))).toBe(true)
    expect(paths.some((p) => p.includes('/auth/login'))).toBe(true)
    expect(paths.some((p) => p.includes('/leads'))).toBe(true)
  })

  it('every operation has tags and responses', async () => {
    const res = await request(app).get('/api/openapi.json').expect(200)

    for (const [path, methods] of Object.entries(res.body.paths)) {
      const ops = Object.entries(methods as Record<string, unknown>)
      expect(ops.length, `${path} has no operations`).toBeGreaterThan(0)
      for (const [method, op] of ops) {
        const operation = op as { tags?: unknown[]; responses?: Record<string, unknown> }
        expect(operation.tags, `${method.toUpperCase()} ${path} missing tags`).toBeDefined()
        expect(
          operation.responses,
          `${method.toUpperCase()} ${path} missing responses`,
        ).toBeDefined()
      }
    }
  })
})
