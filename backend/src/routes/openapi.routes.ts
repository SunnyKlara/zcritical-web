import { Router } from 'express'

export const openapiRouter = Router()

/**
 * OpenAPI 3.1 specification for Critical backend.
 *
 * Hand-written for now — small enough to maintain. When endpoint count grows
 * past ~30, switch to zod-to-openapi auto-generation from shared schemas.
 *
 * Served at:
 *   GET /api/openapi.json  → machine-readable spec
 *
 * Renders nicely in Swagger UI, Postman, Insomnia, Bruno, Stoplight Studio.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://critical.bike'
const API_URL = process.env.API_URL ?? 'http://localhost:4000'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Critical API',
    version: '0.1.0',
    description:
      'Backend API for Critical — smart wind tunnel simulator brand site, admin console, and customer support.',
    contact: {
      name: 'Critical Engineering',
      email: 'dev@critical.bike',
      url: SITE_URL,
    },
    license: {
      name: 'MIT',
      url: 'https://github.com/SunnyKlara/Zcritical/blob/main/LICENSE',
    },
  },
  servers: [
    { url: API_URL, description: 'Current environment' },
    { url: 'https://api.critical.bike', description: 'Production' },
    { url: 'http://localhost:4000', description: 'Local dev' },
  ],
  tags: [
    { name: 'Health', description: 'Liveness and readiness probes' },
    { name: 'Auth', description: 'Admin authentication' },
    { name: 'Leads', description: 'Inquiry / contact form submissions' },
    { name: 'Chat', description: 'Visitor support chat' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'critical_rt',
      },
      CsrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          details: {},
          requestId: { type: 'string' },
        },
      },
      LeadInput: {
        type: 'object',
        required: ['name', 'email', 'message'],
        properties: {
          name: { type: 'string', maxLength: 100 },
          email: { type: 'string', format: 'email' },
          company: { type: 'string', maxLength: 200 },
          phone: { type: 'string', maxLength: 40 },
          message: { type: 'string', maxLength: 2000 },
          source: { type: 'string', maxLength: 40 },
          locale: { type: 'string', enum: ['zh', 'en'] },
        },
      },
      Lead: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          company: { type: 'string' },
          phone: { type: 'string' },
          message: { type: 'string' },
          status: {
            type: 'string',
            enum: ['new', 'contacted', 'qualified', 'won', 'lost'],
          },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string', format: 'password' },
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['accessToken', 'user'],
        properties: {
          accessToken: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'agent'] },
          displayName: { type: 'string' },
          avatarUrl: { type: 'string', format: 'uri' },
          disabled: { type: 'boolean' },
        },
      },
      IssueSessionResponse: {
        type: 'object',
        required: ['sessionId', 'sessionToken'],
        properties: {
          sessionId: { type: 'string', format: 'uuid' },
          sessionToken: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string' }, uptime: { type: 'number' } },
                },
              },
            },
          },
        },
      },
    },
    '/api/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe (checks MongoDB)',
        responses: {
          '200': { description: 'Ready' },
          '503': { description: 'Not ready' },
        },
      },
    },
    '/api/leads': {
      post: {
        tags: ['Leads'],
        summary: 'Submit a lead inquiry',
        description:
          'Public endpoint. Rate-limited to 3 req/min/IP. Honeypot field "website" silently rejects bots.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LeadInput' } },
          },
        },
        responses: {
          '201': {
            description: 'Lead created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ok: { type: 'boolean' }, id: { type: 'string' } },
                },
              },
            },
          },
          '202': { description: 'Honeypot triggered (silently accepted)' },
          '400': {
            description: 'Validation error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '429': { description: 'Rate limited' },
        },
      },
      get: {
        tags: ['Leads'],
        summary: 'List leads (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 500 } },
        ],
        responses: {
          '200': {
            description: 'Lead list',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Lead' } },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/leads/{id}': {
      patch: {
        tags: ['Leads'],
        summary: 'Update lead status / notes (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['new', 'contacted', 'qualified', 'won', 'lost'],
                  },
                  notes: { type: 'string', maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated lead',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Lead' } } },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin login',
        description: 'Returns access token in body, refresh token via httpOnly cookie.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Too many attempts' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        security: [{ CookieAuth: [], CsrfToken: [] }],
        responses: {
          '200': {
            description: 'New access token',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { accessToken: { type: 'string' } } },
              },
            },
          },
          '401': { description: 'Refresh token invalid or missing' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Clear refresh cookie',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Authenticated user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/chat/session': {
      post: {
        tags: ['Chat'],
        summary: 'Issue visitor session token',
        responses: {
          '200': {
            description: 'Visitor session issued',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/IssueSessionResponse' } },
            },
          },
          '429': { description: 'Rate limited' },
        },
      },
    },
  },
} as const

openapiRouter.get('/openapi.json', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.json(spec)
})
