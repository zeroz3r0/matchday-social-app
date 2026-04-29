# Capability Spec: cicd

> **topic_key**: `spec/cicd`
> **type**: `architecture`
> **status**: `active`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

## Purpose

Define build-time gates that block regressions in security posture and code quality before merge.

## Requirements

### Requirement: Security audit gate at high+ severity

The CI pipeline MUST run `npm audit --audit-level=high` on every push and pull request, and MUST fail the build when any vulnerability of severity `high` or `critical` is reported.

#### Scenario: Clean tree passes the gate

- GIVEN the repository's `package-lock.json` resolves to 0 high and 0 critical vulnerabilities
- WHEN CI executes the audit step on a push or pull request
- THEN `npm audit --audit-level=high` exits 0
- AND the job proceeds to subsequent steps

#### Scenario: New high vulnerability blocks merge

- GIVEN a pull request introduces a dependency change that adds a high-severity advisory
- WHEN CI executes the audit step
- THEN the step exits non-zero
- AND the pull request status check is failing
- AND the merge is blocked until the vulnerability is removed, fixed, or the gate is intentionally relaxed via a separate proposal

#### Scenario: Moderate-and-below do not block

- GIVEN the tree contains moderate or lower severity vulnerabilities (e.g., accepted-risk Expo internals, markdown-it ReDoS in trusted-content path)
- WHEN CI executes the audit step
- THEN the step exits 0
- AND those advisories are tracked via PR-body audit table convention, not the gate

## Implementation pointer

`.github/workflows/ci.yml` — `npm audit --audit-level=high` step inserted after `npm ci`, before `prisma generate`, no `continue-on-error`.

## Change history

- `354957b` (PR #12, merged 2026-04-29) — initial creation. Audit gate at `high+`. Tightening to `moderate` is tracked as follow-up #3 in `.sdd/follow-ups/post-sprint1-audit.md`.
