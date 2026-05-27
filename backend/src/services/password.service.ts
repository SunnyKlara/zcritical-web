/**
 * Password strength assessment using zxcvbn-ts.
 *
 * zxcvbn returns a score 0-4:
 *   0 — too guessable
 *   1 — very guessable
 *   2 — somewhat guessable
 *   3 — safely unguessable (online attack survivable)
 *   4 — very unguessable (offline attack survivable)
 *
 * We require ≥3 for admin accounts. The function also enforces a minimum
 * length and rejects passwords matching contextual values (username, email)
 * which zxcvbn would otherwise rate too leniently.
 */
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en'

zxcvbnOptions.setOptions({
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
})

export const MIN_PASSWORD_LENGTH = 12
export const MIN_PASSWORD_SCORE = 3

export interface PasswordCheckResult {
  ok: boolean
  /** zxcvbn score 0-4. */
  score: number
  /** Human-readable feedback (warning + suggestions) when the password is weak. */
  feedback?: { warning?: string; suggestions: string[] }
  /** Estimated guesses to crack at 10/s (online slow hash). Undefined if ok. */
  crackTimeSeconds?: number
}

/**
 * Validate a password against our minimum policy.
 *
 * @param password   The plaintext candidate.
 * @param userInputs Personal context strings (username, email, name) — zxcvbn
 *                   will detect and penalize passwords that contain them.
 */
export function checkPasswordStrength(
  password: string,
  userInputs: string[] = [],
): PasswordCheckResult {
  if (typeof password !== 'string') {
    return {
      ok: false,
      score: 0,
      feedback: { warning: 'Password is required', suggestions: [] },
    }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      score: 0,
      feedback: {
        warning: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
        suggestions: ['Use a longer passphrase, e.g. 4+ random words'],
      },
    }
  }
  const trimmedInputs = userInputs.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
  const result = zxcvbn(password, trimmedInputs)
  if (result.score < MIN_PASSWORD_SCORE) {
    return {
      ok: false,
      score: result.score,
      feedback: {
        warning: result.feedback.warning || 'Password is too weak',
        suggestions: result.feedback.suggestions ?? [],
      },
      crackTimeSeconds:
        typeof result.crackTimesSeconds.onlineThrottling100PerHour === 'number'
          ? result.crackTimesSeconds.onlineThrottling100PerHour
          : undefined,
    }
  }
  return { ok: true, score: result.score }
}
