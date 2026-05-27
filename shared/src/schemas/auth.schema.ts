import { z } from 'zod'
import { USER_ROLES } from '../constants'
import { PublicUserSchema } from './user.schema'

/** Login request. */
export const LoginRequestSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

/** A 6-digit numeric TOTP code. */
export const TotpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Code must be 6 digits')
export type TotpCode = z.infer<typeof TotpCodeSchema>

/** A single backup code is 5+5 hex chars with a hyphen, e.g. `a1b2c-3d4e5`. */
export const BackupCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[0-9a-f]{5}-[0-9a-f]{5}$/, 'Invalid backup code format')

/**
 * Login response. When `requiresTwoFactor` is true, only `twoFactorToken` is
 * returned and the client must complete `/auth/2fa/verify` to obtain real
 * tokens. Otherwise the full success payload is delivered.
 */
export const LoginSuccessResponseSchema = z.object({
  requiresTwoFactor: z.literal(false).optional(),
  accessToken: z.string(),
  user: PublicUserSchema,
})
export type LoginSuccessResponse = z.infer<typeof LoginSuccessResponseSchema>

export const LoginTwoFactorChallengeResponseSchema = z.object({
  requiresTwoFactor: z.literal(true),
  twoFactorToken: z.string(),
  /** Seconds until `twoFactorToken` expires. Suggest UI countdown. */
  expiresIn: z.number().int().positive(),
})
export type LoginTwoFactorChallengeResponse = z.infer<typeof LoginTwoFactorChallengeResponseSchema>

export const LoginResponseSchema = z.union([
  LoginSuccessResponseSchema,
  LoginTwoFactorChallengeResponseSchema,
])
export type LoginResponse = z.infer<typeof LoginResponseSchema>

/** 2FA verification request body. Either `code` (TOTP) or `backupCode`. */
export const TwoFactorVerifyRequestSchema = z
  .object({
    twoFactorToken: z.string().min(10, 'twoFactorToken is required'),
    code: TotpCodeSchema.optional(),
    backupCode: BackupCodeSchema.optional(),
  })
  .refine((v) => Boolean(v.code) !== Boolean(v.backupCode), {
    message: 'Provide exactly one of code or backupCode',
    path: ['code'],
  })
export type TwoFactorVerifyRequest = z.infer<typeof TwoFactorVerifyRequestSchema>

/** 2FA enrollment setup response — returns secret / otpauth URL for QR code. */
export const TwoFactorSetupResponseSchema = z.object({
  /** Base32-encoded TOTP secret. Display once; never returned again. */
  secret: z.string(),
  /** otpauth:// URI to be encoded into a QR code. */
  otpauthUrl: z.string().url(),
  /** Issuer displayed in the authenticator app. */
  issuer: z.string(),
  /** Account label displayed in the authenticator app. */
  account: z.string(),
})
export type TwoFactorSetupResponse = z.infer<typeof TwoFactorSetupResponseSchema>

/** Body for confirming enrollment — user proves they scanned the QR. */
export const TwoFactorEnableRequestSchema = z.object({
  code: TotpCodeSchema,
})
export type TwoFactorEnableRequest = z.infer<typeof TwoFactorEnableRequestSchema>

/** Body for disabling 2FA — requires current password. */
export const TwoFactorDisableRequestSchema = z.object({
  password: z.string().min(1),
})
export type TwoFactorDisableRequest = z.infer<typeof TwoFactorDisableRequestSchema>

/** Change-password request. */
export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(200),
})
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>

/** Standard "weak password" response. */
export const PasswordStrengthFeedbackSchema = z.object({
  error: z.string(),
  score: z.number().int().min(0).max(4),
  warning: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
})
export type PasswordStrengthFeedback = z.infer<typeof PasswordStrengthFeedbackSchema>

/** Response when 2FA is enabled — surface plaintext backup codes once. */
export const TwoFactorEnableResponseSchema = z.object({
  enabled: z.literal(true),
  backupCodes: z.array(BackupCodeSchema).length(10),
})
export type TwoFactorEnableResponse = z.infer<typeof TwoFactorEnableResponseSchema>

/** /auth/2fa/status — used by the admin UI to render the right buttons. */
export const TwoFactorStatusResponseSchema = z.object({
  enabled: z.boolean(),
  /** Number of unused backup codes remaining (0 if disabled). */
  backupCodesRemaining: z.number().int().min(0),
})
export type TwoFactorStatusResponse = z.infer<typeof TwoFactorStatusResponseSchema>

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
 * Short-lived intermediate token issued after step-1 of 2FA login. Carries
 * the user id and a `purpose` claim so it cannot be confused with access /
 * refresh tokens.
 */
export const TwoFactorTokenPayloadSchema = z.object({
  sub: z.string(),
  purpose: z.literal('2fa'),
  iat: z.number().optional(),
  exp: z.number().optional(),
})
export type TwoFactorTokenPayload = z.infer<typeof TwoFactorTokenPayloadSchema>

/** /auth/me — returns current admin profile. */
export const MeResponseSchema = z.object({
  user: PublicUserSchema,
})
export type MeResponse = z.infer<typeof MeResponseSchema>
