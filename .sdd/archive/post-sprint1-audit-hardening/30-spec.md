# Spec: post-Sprint-1 dependency hardening

> **topic_key**: `sdd/post-sprint1-audit-hardening/spec`
> **type**: `architecture`
> **status**: `archived` — delta synced into active specs (`.sdd/active-specs/cicd.md`, `auth.md`, `cron-scheduling.md`)
> **last synced**: 2026-04-29 from `354957b` (PR #12)

## Scope Note

This change is **dependency hygiene + a new CI gate**. It has **no user-facing behavior delta**. Most capability specs report "No change" — they remain in force as-is. The only spec-level addition is a build-time policy in CI/CD. The two compatibility invariants below are explicit because dep bumps cross trust boundaries (password hash format, cron scheduler API).

---

## Capability: cicd (NEW spec)

### Purpose

Define build-time gates that block regressions in security posture and code quality before merge.

### Requirements

#### Requirement: Security audit gate at high+ severity

The CI pipeline MUST run `npm audit --audit-level=high` on every push and pull request, and MUST fail the build when any vulnerability of severity `high` or `critical` is reported.

##### Scenario: Clean tree passes the gate

- GIVEN the repository's `package-lock.json` resolves to 0 high and 0 critical vulnerabilities
- WHEN CI executes the audit step on a push or pull request
- THEN `npm audit --audit-level=high` exits 0
- AND the job proceeds to subsequent steps

##### Scenario: New high vulnerability blocks merge

- GIVEN a pull request introduces a dependency change that adds a high-severity advisory
- WHEN CI executes the audit step
- THEN the step exits non-zero
- AND the pull request status check is failing
- AND the merge is blocked until the vulnerability is removed, fixed, or the gate is intentionally relaxed via a separate proposal

##### Scenario: Moderate-and-below do not block

- GIVEN the tree contains moderate or lower severity vulnerabilities (e.g., accepted-risk Expo internals, markdown-it ReDoS in trusted-content path)
- WHEN CI executes the audit step
- THEN the step exits 0
- AND those advisories are tracked via PR-body audit table convention, not the gate

---

## Capability: auth (password hashing — invariant only)

### Behavior delta

**No change.** Auth flows, endpoints, password reset, and rate limiting are untouched.

### Compatibility Invariants (added because of bcrypt 5 → 6 bump)

#### Requirement: Existing password hashes remain verifiable post-deploy

After upgrading `bcrypt` from `^5.1.1` to `^6.0.0`, the system MUST continue to verify password hashes that were created under bcrypt 5. The on-disk `$2b$` hash format is preserved across bcrypt 5 → 6, so no DB migration, rehashing, or forced password reset is required.

##### Scenario: User authenticates with hash created under bcrypt 5

- GIVEN a user record whose `password_hash` column was written by bcrypt 5
- WHEN the user submits the correct plaintext password to `POST /auth/login` after the bcrypt 6 deploy
- THEN `bcrypt.compare(plaintext, storedHash)` returns true
- AND the login succeeds with no error and no rehash side effect

##### Scenario: New hash uses bcrypt 6

- GIVEN a new user signs up or an existing user resets their password after the deploy
- WHEN `bcrypt.hash(plaintext, cost)` is called
- THEN the resulting hash uses the `$2b$` prefix and is verifiable by both bcrypt 5 and bcrypt 6 implementations

---

## Capability: cron-scheduling (cron jobs — invariant only)

### Behavior delta

**No change.** All declared schedules, their cron expressions, and the work they trigger are unchanged.

### Compatibility Invariants (added because of node-cron 3 → 4 bump)

#### Requirement: All existing schedules continue to fire

After upgrading `node-cron` from `^3.0.3` to `^4.2.1`, every cron schedule registered in `apps/api/src/jobs/scheduler.ts` and `apps/api/src/jobs/legalCronJobs.ts` MUST continue to fire at its declared expression with the same handler. The public surface used (`cron.schedule(expr, fn)` and the `ScheduledTask` type) MUST resolve under node-cron 4.

##### Scenario: T-2h match reminder cron fires on schedule

- GIVEN the T-2h reminder schedule is registered at app boot under node-cron 4
- WHEN its cron expression matches the current time
- THEN the registered handler is invoked exactly once per matching tick

##### Scenario: MVP auto-close cron fires on schedule

- GIVEN the MVP auto-close schedule is registered at app boot under node-cron 4
- WHEN its cron expression matches the current time
- THEN the registered handler is invoked exactly once per matching tick

##### Scenario: Legal cleanup crons fire on schedule

- GIVEN the legal data cleanup schedules in `legalCronJobs.ts` are registered under node-cron 4
- WHEN their cron expressions match the current time
- THEN each registered handler is invoked exactly once per matching tick
- AND the `ScheduledTask` type assigned at `legalCronJobs.ts` resolves at typecheck time under node-cron 4

---

## Capabilities with No Change

| Capability                                             | Status                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| push-notifications                                     | No change. No code path modified.                                                                                                          |
| auth flows (signup, login, reset, rate-limit)          | No change. Only the underlying hash library is bumped (see invariants above).                                                              |
| legal / GDPR flow                                      | No change. Only the cron library backing cleanup jobs is bumped (see invariants above).                                                    |
| api contracts (REST endpoints, payloads, status codes) | No change.                                                                                                                                 |
| mobile UI (any screen, any component)                  | No change. `@expo/ngrok` removal is a dev-only tooling cleanup with zero source references.                                                |
| email delivery (resend / svix)                         | No change. svix override is a minor bump within resend's webhook-signing surface; smoke-tested via password-reset email path per proposal. |

---

## Acceptance Criteria

- `npm audit --audit-level=high` exits 0 at repo root
- `.github/workflows/ci.yml` includes the `npm audit --audit-level=high` step
- `npm run test:shared` → 53/53 green
- `npm run test:api` → 130/130 green
- `npm run lint` → 0 errors, ≤ 196 warnings (no new warnings)
- `npm run format:check` clean
- All 3 `tsc --noEmit` workspace checks exit 0
- PR body contains audit delta table (pre 19 → post ≤ 8) with accepted-risk rows annotated

## Out of Scope (explicit)

Push notification behavior, auth flow behavior, legal/GDPR flow, API contract, and mobile UI are NOT modified by this change. Any apparent behavior change observed during apply MUST be treated as a regression and rolled back, not specced here.
