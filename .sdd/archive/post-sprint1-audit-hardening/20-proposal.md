# Proposal: post-Sprint-1 dependency hardening

> **topic_key**: `sdd/post-sprint1-audit-hardening/proposal`
> **type**: `architecture`
> **status**: `archived`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

## Intent

Close the security audit gap left after Sprint 1 / PR #11 (19 vulns: 0 crit, 2 high, 17 mod) and lock the result with a CI gate so we don't regress. Builds on `10-explore.md`.

## Scope

### In Scope

- Bump `apps/api`: `bcrypt ^5.1.1 → ^6.0.0` (kills both highs: tar + node-pre-gyp)
- Bump `apps/api`: `node-cron ^3.0.3 → ^4.2.1` (drops uuid + all transitives)
- **Drop** `@expo/ngrok` from `apps/mobile/package.json` (Q2: zero usages found — speculative scaffold dep)
- Add root `package.json` `overrides`:
  - `resend > svix: ^1.92.2`
  - `xcode > uuid: ^14`
  - `@expo/metro-config > postcss: ^8.5.10`
- Verify `node-cron@4.2.1` still exports `ScheduledTask` (used at `apps/api/src/jobs/legalCronJobs.ts:18`)
- Add CI gate to `.github/workflows/ci.yml`: `npm audit --audit-level=high`
- PR body audit table (extends PR #7 / #11 convention): pre vs post counts + accepted-risk justification

### Out of Scope

- Expo SDK 56 upgrade (resolves 7+ Expo-internal "noise" vulns naturally; separate proposal)
- Replacing `react-native-markdown-display` (only renders trusted internal ToS/Privacy markdown)
- Replacing `bcrypt` with `argon2` / `@node-rs/bcrypt` (perf/maintenance, not security)
- Dependabot / Renovate setup (separate proposal)
- New `SECURITY.md` file (Q4: PR-body convention preferred)

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- None (config + dependency hygiene only; no spec-level behavior changes)

## Approach

Single PR: `chore(security): post-Sprint-1 dependency hardening`. Sequence work as separate commits inside the PR for review tractability:

1. `chore(api): bump bcrypt to ^6.0.0` — run `npm test:api` to confirm green
2. `chore(api): bump node-cron to ^4.2.1` — verify `ScheduledTask` type, run typecheck + tests
3. `chore(mobile): drop unused @expo/ngrok dep` — Q2 evidence: zero references in source/scripts/CI
4. `chore: add npm overrides for svix, xcode>uuid, postcss` — root `package.json`
5. `ci: add npm audit --audit-level=high gate` — `.github/workflows/ci.yml`
6. PR body audit table

Acceptable evidence per Q1: existing tests stay green across the bump (RED-before-GREEN reserved for new behavior). Q5: resend→svix override smoke-tested via password-reset email path documented in PR body.

## Affected Areas

| Area                                 | Impact   | Description                                                   |
| ------------------------------------ | -------- | ------------------------------------------------------------- |
| `apps/api/package.json`              | Modified | bcrypt + node-cron version bumps                              |
| `apps/mobile/package.json`           | Modified | Remove `@expo/ngrok` line                                     |
| `package.json` (root)                | Modified | New `overrides` block (3 entries)                             |
| `package-lock.json`                  | Modified | Large churn (expected)                                        |
| `.github/workflows/ci.yml`           | Modified | New audit step (location: alongside test job, after `npm ci`) |
| `apps/api/src/jobs/legalCronJobs.ts` | Verify   | Confirm `ScheduledTask` type import still resolves            |

## Risks

| Risk                                           | Likelihood | Mitigation                                                                                     |
| ---------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| bcrypt 6 Windows dev binaries fail to download | Low        | CI is Linux (prebuilds confirmed); dev workaround = `npm rebuild bcrypt`                       |
| node-cron@4 drops `ScheduledTask` named export | Low        | Pre-flight `npm view node-cron@4.2.1` types, fallback = inline interface                       |
| `svix@1.92.2` breaks resend's webhook signing  | Low        | Override is minor bump; smoke test password-reset email                                        |
| Lockfile churn obscures review                 | Med        | Isolate each change in its own commit                                                          |
| `npm overrides` don't propagate to workspaces  | Low        | npm 10+ supports nested overrides at root; verify with `npm ls postcss svix uuid` post-install |

## Rollback Plan

Per-commit revert is possible (each scope is one commit). Full rollback: `git revert <merge-sha>` and `npm ci` to restore prior lockfile. CI audit step is additive — its removal doesn't affect runtime. No DB migrations, no API contract changes, no config secrets touched.

## Dependencies

- npm ≥ 10 (already required by repo)
- Node 20 (already CI baseline) for bcrypt 6 prebuilt binaries

## Success Criteria

- `npm audit --audit-level=high` exits 0 at repo root
- Total root vuln count ≤ 8 (Expo SDK noise + accepted markdown-it ReDoS, both documented)
- `npm run test:shared` → 53/53 green
- `npm run test:api` → 130/130 green
- `npm run lint` → 0 errors, ≤ 196 warnings (no new warnings)
- `npm run format:check` → clean
- All 3 `tsc --noEmit` workspace checks exit 0
- `.github/workflows/ci.yml` includes `npm audit --audit-level=high` step
- PR body contains audit delta table (pre 19 → post ≤ 8) with accepted-risk rows annotated

## Effort Estimate

**~2h** (refined down from explore's 2-3h). Q2 resolution shrinks the override block from 4 to 3 entries and removes the need for any Q2 investigation during apply.
