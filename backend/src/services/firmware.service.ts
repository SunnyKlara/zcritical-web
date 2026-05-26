import { createHash } from 'node:crypto'

/**
 * Compare two semantic versions.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 *
 * Handles only the basic major.minor.patch form. Pre-release / build
 * suffixes are compared lexicographically as a tie-breaker.
 */
export function compareSemver(a: string, b: string): number {
  const [aBase, aPre] = a.split('-', 2)
  const [bBase, bPre] = b.split('-', 2)

  const ap = (aBase ?? '').split('.').map(Number)
  const bp = (bBase ?? '').split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const ai = ap[i] ?? 0
    const bi = bp[i] ?? 0
    if (ai !== bi) return ai - bi
  }

  // Same numeric core — pre-release is "less than" no pre-release
  if (aPre && !bPre) return -1
  if (!aPre && bPre) return 1
  if (aPre && bPre) return aPre < bPre ? -1 : aPre > bPre ? 1 : 0
  return 0
}

/**
 * Determine if a device is in the rollout cohort for a release.
 * Hash the serial number, take modulo 100, compare against rolloutPercent.
 *
 * This is deterministic — the same device always lands in the same bucket,
 * so a 50% rollout consistently includes the same devices on every poll.
 */
export function isInRollout(serialNumber: string, rolloutPercent: number): boolean {
  if (rolloutPercent >= 100) return true
  if (rolloutPercent <= 0) return false

  const hash = createHash('sha256').update(serialNumber).digest()
  // Use first 4 bytes as uint32, then modulo 100
  const bucket = hash.readUInt32BE(0) % 100
  return bucket < rolloutPercent
}
