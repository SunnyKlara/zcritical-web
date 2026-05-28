# Phase 0 Security Hardening — Batches 1-3

> **Branch:** `feat/sec-phase0-batch123` → `main`
>
> **Commits in this PR (3, oldest first):**
>
> 1. `c0d43f5` — `feat(W4): admin 2FA + lockout + idempotency + webhook replay`
> 2. `0b6a243` — `feat(W4): PII encryption + CSP nonce + Semgrep + zxcvbn + SBOM`
> 3. `149ad06` — `feat(W4): GDPR data rights + new-device alerts + anomaly cron + ZAP`

## What this PR does

Closes the Phase 0 security backlog defined in `docs/SECURITY-AUDIT.md`. Three logically separated batches, each independently shippable / revertable.

## Coverage matrix (vs. SECURITY-AUDIT.md severity)

| Item                                                         | Severity | Status |
| ------------------------------------------------------------ | -------- | ------ |
| Admin 2FA (TOTP, backup codes, AES-256-GCM secret)           | 🔴       | ✅     |
| PII field-level encryption + blind-index lookups             | 🔴       | ✅     |
| PayPal webhook replay protection                             | 🟠       | ✅     |
| Idempotency middleware on all order mutations                | 🟠       | ✅     |
| Per-username rate limit on top of per-IP                     | 🟠       | ✅     |
| CSP nonce (production drops `unsafe-inline` / `unsafe-eval`) | 🟠       | ✅     |
| Semgrep + 7 custom business rules                            | 🟠       | ✅     |
| GDPR / CCPA data export + delete API (OTP + 30d grace)       | 🟡       | ✅     |
| Cookie SameSite decision (ADR-0002)                          | 🟡       | ✅     |
| Business anomaly detector (Sentry tripwires, no auto-block)  | 🟡       | ✅     |
| SBOM generation (CycloneDX)                                  | 🟡       | ✅     |
| OWASP ZAP baseline workflow scaffold                         | 🟡       | ✅     |
| Account lockout (5 fails / 15 min)                           | 🟢       | ✅     |
| Strong password policy (zxcvbn-ts ≥ 3)                       | 🟢       | ✅     |
| TOTP secret encryption                                       | 🟢       | ✅     |
| New-device login email alerts                                | 🟢       | ✅     |

## Tests

```
shared:   14 passed
backend:  43 passed   (+11 new in this PR)
─────────────────────────
total:    57 passed   (8 test files, 0 failures)
```

Highlights of new tests:

- 2FA enroll happy path, wrong TOTP, one-time backup-code consumption
- Account lockout state machine
- Idempotency middleware: cache hit, body-conflict 422, missing key, malformed key
- PII encryption: stored ciphertext shape, transparent decrypt, blind-index find
- GDPR: always-202 enumeration resistance, export round-trip, wrong-OTP rejection, full delete + grace + hard-delete

## Manual smoke checklist (before merge)

- [ ] `pnpm -r typecheck` (already green locally)
- [ ] `pnpm -r lint`
- [ ] `pnpm -r test`
- [ ] `pnpm --filter backend build`
- [ ] `pnpm --filter frontend build`
- [ ] Confirm `ENCRYPTION_KEY` is set in Render production env (`openssl rand -hex 32`)
- [ ] Confirm `PAYPAL_WEBHOOK_ID` is set in Render production env
- [ ] After merge: run `pnpm --filter backend exec tsx src/scripts/encrypt-existing-pii.ts` once against production Mongo to encrypt pre-existing rows (idempotent — safe to re-run)

## New env vars

| Var              | Required in prod?           | Generate with          |
| ---------------- | --------------------------- | ---------------------- |
| `ENCRYPTION_KEY` | yes                         | `openssl rand -hex 32` |
| `TOTP_ISSUER`    | no (defaults to `Critical`) | n/a                    |

## Files added (highlights)

- `backend/src/lib/crypto.ts`
- `backend/src/db/encrypted-fields.plugin.ts`
- `backend/src/middleware/idempotency.middleware.ts`
- `backend/src/services/{two-factor,password,gdpr,login-device,anomaly}.service.ts`
- `backend/src/routes/account.routes.ts`
- `backend/src/scripts/encrypt-existing-pii.ts`
- `backend/src/__tests__/{idempotency,encryption,gdpr}.test.ts`
- `frontend/src/middleware.ts` (CSP nonce per request)
- `.semgrep.yml` (7 custom rules)
- `.zap/rules.tsv`
- `.github/workflows/{semgrep,sbom,zap-baseline}.yml`
- `docs/runbooks/SECURITY-INCIDENT.md`
- ADR-0002 in `docs/DECISIONS.md`

## What's still on the backlog

- 🟡 audit log hot/cold tiering (90 days hot + 1 year cold storage on R2)
- 🟢 `X-Robots-Tag: noindex` HTTP header on `/admin/*` (currently meta-only)
- 🟢 SRI on third-party CDN scripts (we don't ship any yet, so this is a future-proofing item)
- 🟢 Bug bounty programme (recommended: launch 3 months after public site goes live)
- Real penetration test — needs staging environment with real domain. ZAP workflow is wired but is no-op until `ZAP_TARGET_URL` is set.

## Reviewer notes

- Each commit cleanly bisects: it should pass `typecheck / lint / test / build` on its own. If reverting one batch only, take the full commit.
- `account.routes.ts` is the only fully new public surface; everything else is additive on existing endpoints.
- The frontend change (CSP middleware + nonce wiring in `app/layout.tsx`) is the only place where a regression could break a non-admin route. Suggested manual smoke: load `/`, `/zh`, `/en`, `/[locale]/checkout`, and inspect the response `Content-Security-Policy` header.
