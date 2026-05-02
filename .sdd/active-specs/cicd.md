# Capability Spec: cicd

> **topic_key**: `spec/cicd`
> **type**: `architecture`
> **status**: `active`
> **last synced**: 2026-05-02 — pending merge of `chore/tighten-audit-gate-moderate` (PR #20)

## Purpose

Define build-time gates that block regressions in security posture and code quality before merge.

## Requirements

### Requirement: Security audit gate at moderate+ severity

The CI pipeline MUST run `npm audit --audit-level=moderate` on every push and pull request, and MUST fail the build when any vulnerability of severity `moderate`, `high`, or `critical` is reported.

#### Scenario: Clean tree passes the gate

- GIVEN the repository's `package-lock.json` resolves to 0 moderate, 0 high, and 0 critical vulnerabilities
- WHEN CI executes the audit step on a push or pull request
- THEN `npm audit --audit-level=moderate` exits 0
- AND the job proceeds to subsequent steps

#### Scenario: New moderate-or-worse vulnerability blocks merge

- GIVEN a pull request introduces a dependency change that adds a moderate, high, or critical severity advisory
- WHEN CI executes the audit step
- THEN the step exits non-zero
- AND the pull request status check is failing
- AND the merge is blocked until the vulnerability is removed, fixed, or the gate is intentionally relaxed via a separate proposal

#### Scenario: Low-severity advisories do not block

- GIVEN the tree contains only low-severity (or info) advisories
- WHEN CI executes the audit step
- THEN the step exits 0
- AND those advisories are tracked via the PR-body audit table convention, not the gate

## Implementation pointer

`.github/workflows/ci.yml` — `npm audit --audit-level=moderate` step inserted after `npm ci`, before `prisma generate`, no `continue-on-error`.

`SECURITY.md` documents the gate policy for contributors.

## Change history

- `354957b` (PR #12, merged 2026-04-29) — initial creation. Audit gate at `high+`.
- pending merge of PR #20 (`chore/tighten-audit-gate-moderate`) — gate tightened from `high+` to `moderate+` after PR #19 (markdown swap) cleared the last 2 moderates from the root tree. Closes follow-up #3 / partial of issue #16 (the SDK 56 portion of #16 is no longer required for the gate tightening; SDK 56 is a separate concern, deferred to a future change once SDK 56 is stable — currently canary-only).
