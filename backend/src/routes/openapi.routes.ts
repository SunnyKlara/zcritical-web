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
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zcritical.co'
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
      email: 'dev@zcritical.co',
      url: SITE_URL,
    },
    license: {
      name: 'MIT',
      url: 'https://github.com/SunnyKlara/Zcritical/blob/main/LICENSE',
    },
  },
  servers: [
    { url: API_URL, description: 'Current environment' },
    { url: 'https://api.zcritical.co', description: 'Production' },
    { url: 'http://localhost:4000', description: 'Local dev' },
  ],
  tags: [
    { name: 'Health', description: 'Liveness and readiness probes' },
    { name: 'Auth', description: 'Admin authentication' },
    { name: 'Leads', description: 'Inquiry / contact form submissions' },
    { name: 'Chat', description: 'Visitor support chat' },
    { name: 'Account', description: 'GDPR / CCPA data-subject rights endpoints' },
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
        oneOf: [
          {
            type: 'object',
            required: ['accessToken', 'user'],
            properties: {
              requiresTwoFactor: { type: 'boolean', enum: [false] },
              accessToken: { type: 'string' },
              user: { $ref: '#/components/schemas/User' },
            },
          },
          {
            type: 'object',
            required: ['requiresTwoFactor', 'twoFactorToken', 'expiresIn'],
            properties: {
              requiresTwoFactor: { type: 'boolean', enum: [true] },
              twoFactorToken: { type: 'string' },
              expiresIn: { type: 'integer' },
            },
          },
        ],
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
        summary: 'Admin login (step 1)',
        description:
          'Returns access token in body when 2FA is disabled. When 2FA is enabled, returns ' +
          '`{ requiresTwoFactor: true, twoFactorToken, expiresIn }` and the client must call ' +
          '`/api/auth/2fa/verify` to complete the flow.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Login successful or 2FA challenge issued',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
          '401': { description: 'Invalid credentials' },
          '423': { description: 'Account temporarily locked' },
          '429': { description: 'Too many attempts (per IP or per username)' },
        },
      },
    },
    '/api/auth/2fa/verify': {
      post: {
        tags: ['Auth'],
        summary: 'Admin login (step 2 — TOTP / backup code)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['twoFactorToken'],
                properties: {
                  twoFactorToken: { type: 'string' },
                  code: { type: 'string', pattern: '^\\d{6}$' },
                  backupCode: { type: 'string', pattern: '^[0-9a-f]{5}-[0-9a-f]{5}$' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login completed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '401': { description: 'Invalid or expired challenge / wrong code' },
          '423': { description: 'Account locked' },
          '429': { description: 'Too many attempts' },
        },
      },
    },
    '/api/auth/2fa/status': {
      get: {
        tags: ['Auth'],
        summary: 'Get current admin 2FA status',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: '2FA status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    backupCodesRemaining: { type: 'integer', minimum: 0 },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/2fa/setup': {
      post: {
        tags: ['Auth'],
        summary: 'Begin 2FA enrollment',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'TOTP secret + otpauth URL for QR code',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['secret', 'otpauthUrl', 'issuer', 'account'],
                  properties: {
                    secret: { type: 'string' },
                    otpauthUrl: { type: 'string', format: 'uri' },
                    issuer: { type: 'string' },
                    account: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '409': { description: '2FA already enabled' },
        },
      },
    },
    '/api/auth/2fa/enable': {
      post: {
        tags: ['Auth'],
        summary: 'Confirm 2FA enrollment with first code',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: { code: { type: 'string', pattern: '^\\d{6}$' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '2FA enabled — backup codes returned exactly once',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    backupCodes: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          '400': { description: 'Run /auth/2fa/setup first' },
          '401': { description: 'Invalid code' },
          '409': { description: '2FA already enabled' },
        },
      },
    },
    '/api/auth/2fa/disable': {
      post: {
        tags: ['Auth'],
        summary: 'Disable 2FA (requires password)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: { password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: '2FA disabled' },
          '401': { description: 'Password incorrect' },
        },
      },
    },
    '/api/auth/2fa/backup-codes': {
      post: {
        tags: ['Auth'],
        summary: 'Regenerate backup codes (invalidates previous set)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'New backup codes issued' },
          '400': { description: '2FA is not enabled' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change current admin password (requires current password + zxcvbn ≥3)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 12, maxLength: 200 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Password changed' },
          '400': {
            description: 'Weak password (zxcvbn score < 3) or unchanged',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    score: { type: 'integer', minimum: 0, maximum: 4 },
                    warning: { type: 'string' },
                    suggestions: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Current password incorrect' },
        },
      },
    },
    '/api/account/data-request': {
      post: {
        tags: ['Account'],
        summary: 'Initiate a GDPR/CCPA data export or delete request',
        description:
          'Sends a 6-digit OTP to the supplied email regardless of whether the email is known to ' +
          'us (prevents enumeration). Always responds 202.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'kind'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  kind: { type: 'string', enum: ['export', 'delete'] },
                },
              },
            },
          },
        },
        responses: {
          '202': { description: 'OTP dispatched (always)' },
          '400': { description: 'Validation error' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/api/account/data-request/verify': {
      post: {
        tags: ['Account'],
        summary: 'Verify OTP and execute the requested action',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'kind', 'otp'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  kind: { type: 'string', enum: ['export', 'delete'] },
                  otp: { type: 'string', pattern: '^\\d{6}$' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description:
              'Export JSON dump (kind=export) or deletion-scheduled receipt (kind=delete)',
          },
          '400': { description: 'OTP invalid / expired / max attempts exceeded' },
        },
      },
    },
    '/api/account/data-request/cancel-deletion': {
      post: {
        tags: ['Account'],
        summary: 'Reverse a pending soft-delete during the 30-day grace window',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'otp'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  otp: { type: 'string', pattern: '^\\d{6}$' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Cancellation accepted' },
          '400': { description: 'No pending request / OTP invalid' },
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
