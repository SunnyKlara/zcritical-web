import { z } from 'zod'
import { USER_ROLES } from '../constants'
import { PublicUserSchema } from './user.schema'

/** Login request. */
export const LoginRequestSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

/**
 * Login response — discriminated union.
 * - `status: 'authenticated'` — full login completed (no 2FA, or already verified).
 * - `status: 'mfa_required'`  — TOTP 2FA enabled; client must call /api/auth/verify-2fa
 *   with `mfaToken` + `code` to finish login. No accessToken / refresh cookie issued yet.
 *
 * Refresh token is delivered via httpOnly cookie, never in body.
 */
export const LoginAuthenticatedSchema = z.object({
  status: z.literal('authenticated'),
  accessToken: z.string(),
  user: PublicUserSchema,
})
export type LoginAuthenticated = z.infer<typeof LoginAuthenticatedSchema>

export const LoginMfaRequiredSchema = z.object({
  status: z.literal('mfa_required'),
  /** Short-lived (5 min) opaque token to be exchanged at /api/auth/verify-2fa. */
  mfaToken: z.string(),
})
export type LoginMfaRequired = z.infer<typeof LoginMfaRequiredSchema>

export const LoginResponseSchema = z.discriminatedUnion('status', [
  LoginAuthenticatedSchema,
  LoginMfaRequiredSchema,
])
export type LoginResponse = z.infer<typeof LoginResponseSchema>

/** Verify 2FA — exchanges mfaToken + 6-digit code (or recovery code) for full login. */
export const Verify2FARequestSchema = z
  .object({
    mfaToken: z.string().min(1),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'TOTP code must be 6 digits')
      .optional(),
    recoveryCode: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid recovery code format')
      .optional(),
  })
  .refine((v) => Boolean(v.code) !== Boolean(v.recoveryCode), {
    message: 'Provide either code or recoveryCode, not both',
  })
export type Verify2FARequest = z.infer<typeof Verify2FARequestSchema>

/** /auth/2fa/setup — returns provisioning data; not yet activated. */
export const Setup2FAResponseSchema = z.object({
  /** Base32-encoded secret for manual entry. */
  secret: z.string(),
  /** otpauth:// URI for QR consumption. */
  uri: z.string(),
  /** Pre-rendered QR code as data URL (data:image/png;base64,...). */
  qr: z.string(),
})
export type Setup2FAResponse = z.infer<typeof Setup2FAResponseSchema>

/** /auth/2fa/verify-setup — confirms one TOTP, activates 2FA, returns recovery codes. */
export const VerifySetup2FARequestSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
})
export type VerifySetup2FARequest = z.infer<typeof VerifySetup2FARequestSchema>

export const VerifySetup2FAResponseSchema = z.object({
  /** Plaintext recovery codes — display ONCE, never returned again. */
  recoveryCodes: z.array(z.string()).length(8),
})
export type VerifySetup2FAResponse = z.infer<typeof VerifySetup2FAResponseSchema>

/** /auth/2fa/disable — turns 2FA off (requires password + valid TOTP/recovery). */
export const Disable2FARequestSchema = z
  .object({
    password: z.string().min(1),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/)
      .optional(),
    recoveryCode: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
      .optional(),
  })
  .refine((v) => Boolean(v.code) !== Boolean(v.recoveryCode), {
    message: 'Provide either code or recoveryCode, not both',
  })
export type Disable2FARequest = z.infer<typeof Disable2FARequestSchema>

/** JWT access-token payload (admin users). */
export const AccessTokenPayloadSchema = z.object({
  sub: z.string(),
  username: z.string(),
  role: z.enum(USER_ROLES),
  iat: z.number().optional(),
  exp: z.number().optional(),
})
export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>

/** JWT refresh-token payload. */
export const RefreshTokenPayloadSchema = z.object({
  sub: z.string(),
  jti: z.string(),
  iat: z.number().optional(),
  exp: z.number().optional(),
})
export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>

/**
 * MFA token payload — short-lived JWT issued after step-1 (password OK) and
 * exchanged at step-2 (TOTP verify). Distinct secret from access/refresh tokens
 * so an attacker who steals one type cannot forge the others.
 */
export const MfaTokenPayloadSchema = z.object({
  sub: z.string(),
  /** Unique id, used for per-token attempt counting. */
  jti: z.string(),
  /** Always 'mfa' — fail-safe so other token verifiers cannot be tricked into accepting it. */
  purpose: z.literal('mfa'),
  iat: z.number().optional(),
  exp: z.number().optional(),
})
export type MfaTokenPayload = z.infer<typeof MfaTokenPayloadSchema>

/** /auth/me — returns current admin profile + 2FA status. */
export const MeResponseSchema = z.object({
  user: PublicUserSchema.extend({
    /** Whether 2FA is currently enabled on this account. */
    totpEnabled: z.boolean(),
  }),
})
export type MeResponse = z.infer<typeof MeResponseSchema>
