# Capability Spec: auth

> **topic_key**: `spec/auth`
> **type**: `architecture`
> **status**: `active`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

## Purpose

Email + password authentication for the API (signup, login, password reset, rate-limit).

The full behavioral spec for auth flows (endpoints, payloads, status codes, rate limits) lives in earlier change artifacts (PRs #1–#11) and the test suite at `apps/api/test/routes/auth.test.ts` and `apps/api/test/services/passwordReset.test.ts`. This entry tracks **library-compatibility invariants** that future changes must not break.

## Compatibility Invariants

### Requirement: Existing password hashes remain verifiable across bcrypt major bumps

The system MUST continue to verify password hashes that were created under any prior bcrypt major version. As of `354957b` the lockfile resolves to `bcrypt@^6.0.0`; the on-disk `$2b$` hash format is preserved across the bcrypt 5 → 6 boundary, so no DB migration, rehashing, or forced password reset is required when the library is bumped within this format family.

#### Scenario: User authenticates with hash created under prior bcrypt major

- GIVEN a user record whose `password_hash` column was written by a prior bcrypt major (e.g., bcrypt 5, cost factor as previously configured)
- WHEN the user submits the correct plaintext password to `POST /auth/login` after the bump deploy
- THEN `bcrypt.compare(plaintext, storedHash)` returns true
- AND the login succeeds with no error and no rehash side effect

#### Scenario: New hash uses current bcrypt major

- GIVEN a new user signs up or an existing user resets their password after the deploy
- WHEN `bcrypt.hash(plaintext, cost)` is called
- THEN the resulting hash uses the `$2b$` prefix and is verifiable by both the prior and current bcrypt majors

## Implementation pointers

- `apps/api/src/routes/auth.ts` — login, register
- `apps/api/src/services/passwordReset.ts` — reset flow
- Cost factors: `12` for password hashing, plus `BCRYPT_TOKEN_COST` / `BCRYPT_PASSWORD_COST` constants for reset tokens
- Tests use `$2b$12$...` and `$2b$10$...` mock hashes — exactly the pre-bump on-disk format

## Change history

- `354957b` (PR #12, merged 2026-04-29) — invariant added when bumping bcrypt 5 → 6. No behavior delta.
