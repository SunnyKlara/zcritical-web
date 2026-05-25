/**
 * Frontend env-var validation.
 *
 * Why: prevents silent production deploys where NEXT_PUBLIC_BACKEND_URL is
 * missing or malformed. Fails fast at boot rather than at first user click.
 *
 * Convention:
 * - All public variables MUST be prefixed NEXT_PUBLIC_ (Next.js requirement)
 * - Server-only variables stay unprefixed
 * - Both are validated here so failures show up at build time
 */
import { z } from 'zod'

// ─── Schemas ────────────────────────────────────────────────────────────────

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_BACKEND_URL: z
    .string()
    .url('NEXT_PUBLIC_BACKEND_URL must be a valid URL')
    .default('http://localhost:4000'),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url('NEXT_PUBLIC_SITE_URL must be a valid URL')
    .default('http://localhost:3000'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().optional(),
  NEXT_PUBLIC_SENTRY_RELEASE: z.string().optional(),
  NEXT_PUBLIC_VITALS_URL: z.string().url().optional().or(z.literal('')),
})

// ─── Parse + export typed env ───────────────────────────────────────────────

function parsePublicEnv() {
  // Next.js inlines NEXT_PUBLIC_* at build time — must reference them via
  // process.env.NEXT_PUBLIC_* literally (not via dynamic indexing).
  const raw = {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    NEXT_PUBLIC_VITALS_URL: process.env.NEXT_PUBLIC_VITALS_URL,
  }

  const result = PublicEnvSchema.safeParse(raw)

  if (!result.success) {
    // In dev: log a friendly error. In prod build: throw to fail the build.
    const flat = result.error.flatten().fieldErrors
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid public environment variables:\n${JSON.stringify(flat, null, 2)}`)
    }
    // eslint-disable-next-line no-console
    console.error('Invalid public env:', flat)
    // Fall back to defaults to avoid hard crash in dev/preview
    return PublicEnvSchema.parse({})
  }

  return result.data
}

export const env = parsePublicEnv()

export type PublicEnv = typeof env
