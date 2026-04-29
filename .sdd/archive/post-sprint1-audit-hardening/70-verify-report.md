# Verify Report: post-Sprint-1 dependency hardening

> **topic_key**: `sdd/post-sprint1-audit-hardening/verify-report`
> **type**: `architecture`
> **status**: `archived`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

**Mode**: Standard verify (Strict TDD not active — config + dep hygiene, no behavior delta)
**Branch verified**: `chore/post-sprint1-audit-hardening` (HEAD `c08da4e`, 5 commits from master `2100e7f`)
**PR**: https://github.com/zeroz3r0/matchday-social-app/pull/12 — MERGED as squash `354957b`

---

## Verdict: **APPROVE FOR MERGE WITH FOLLOW-UPS** ✅

All 7 spec acceptance criteria pass at HEAD. Both compatibility invariants hold. Design fidelity is high. All 16 tasks complete. Three apply-phase deviations reviewed — **none are CRITICAL**.

---

## 1. Spec Acceptance Criteria — re-executed at HEAD

| Criterion                                                | Result  | Evidence                                                                                                   |
| -------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `npm audit --audit-level=high` exits 0 at repo root      | ✅ PASS | exit 0; only 2 moderates remain (markdown-it ReDoS, accepted-risk per spec)                                |
| CI workflow includes `npm audit --audit-level=high` step | ✅ PASS | `.github/workflows/ci.yml:21-24` — placed after `npm ci`, before `prisma generate`, no `continue-on-error` |
| `npm run test:shared` → 53/53                            | ✅ PASS | 53/53 passed, vitest 4.1.5, 294ms                                                                          |
| `npm run test:api` → 130/130                             | ✅ PASS | 16 test files, 130/130 passed, vitest 4.1.5, 2.90s                                                         |
| `npm run lint` → 0 errors, ≤ 196 warnings                | ✅ PASS | 0 errors, 196 warnings (= threshold)                                                                       |
| `npm run format:check` clean                             | ✅ PASS | "All matched files use Prettier code style!"                                                               |
| `npm run typecheck` (3 workspaces) → exit 0              | ✅ PASS | shared + api + mobile all clean (`tsc --noEmit` ×3)                                                        |

## 2. Compatibility Invariants

### A. bcrypt $2b$ hashes from v5 verify under v6 — PRESERVED

- `auth.ts:6` and `passwordReset.ts:18` — `import bcrypt from 'bcrypt'` (default import, unchanged)
- Cost factors unchanged: `bcrypt.hash(data.password, 12)` at `auth.ts:77`; `BCRYPT_TOKEN_COST` / `BCRYPT_PASSWORD_COST` constants in `passwordReset.ts`
- No salt/rounds modifications anywhere
- Tests use `$2b$12$...` and `$2b$10$...` mock hashes — exactly the v5 on-disk format. **All 130 pass under bcrypt 6.**

### B. All 5 cron schedules continue to fire — PRESERVED

| File:Line              | Expression     | Handler                 |
| ---------------------- | -------------- | ----------------------- |
| `legalCronJobs.ts:95`  | `0 3 * * *`    | hardDelete              |
| `legalCronJobs.ts:103` | `0 * * * *`    | exportSweep             |
| `scheduler.ts:94`      | `*/5 * * * *`  | auto-confirm stats      |
| `scheduler.ts:115`     | `*/5 * * * *`  | auto-close voting + MVP |
| `scheduler.ts:231`     | `*/30 * * * *` | T-2h match reminder     |

All 5 expressions verbatim per design. `import cron, { ScheduledTask } from 'node-cron'` resolves under v4 (typecheck passes). `{ scheduled: false }` removed (grep confirms 0 matches in source).

## 3. Design Fidelity

Commit order matches design exactly: 1.bcrypt → 2.node-cron → 3.ngrok → 4.overrides → 5.ci. All 5 commits authored by `zeroz3r0`. Conventional commits, lowercase verbs, no Co-Authored-By, no AI attribution.

File Changes table — 1:1 match with design. Commit 6 (lockfile-only) was conditional and apply correctly folded into commit 4. Design-compliant.

## 4. Task Completion

**16/16 tasks complete**. No incomplete tasks.

## 5. Apply-phase Deviations — Severity

| #   | Deviation                                                                                                                                       | Severity                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | node-cron v4 auto-starts on `cron.schedule()` (design said it didn't); redundant `.start()` calls in `scheduler.ts:86-87` are idempotent no-ops | ⚠️ **WARNING** — spec invariant preserved; tech debt only                                                     |
| 2   | Override syntax: flat `svix`, range-scoped `postcss<8.5.10`, only `xcode>uuid` nested                                                           | ⚠️ **WARNING** — npm 11 silently dropped nested overrides for workspace-child deps. Spec is silent on syntax. |
| 3   | No separate commit 6 (lockfile) — folded into commit 4                                                                                          | ✅ **ACCEPTABLE** — design Decision 6 explicitly allowed                                                      |

**No CRITICAL deviations.**

## 6. PR Body Quality — Excellent

Audit table (root + 3 workspaces with delta), test counts, lint delta, accepted-risk table for markdown-it (with GHSA), cross-refs to engram topic_keys, per-commit summary, verification matrix, honest deviation disclosure, rollback plan. **No AI attribution / Co-Authored-By** confirmed.

## 7. Issues Found

### CRITICAL: None ✅

### WARNING (track, don't block)

1. **Misleading comment + redundant `.start()` calls** in `scheduler.ts:86-87` and `legalCronJobs.ts:91-92` — v4 actually auto-starts; the comment "node-cron@4 tasks do not auto-start" is factually wrong post-verification.
2. **Flat `svix` override** has broader blast radius than nested would have. Functionally equivalent today (only `resend` consumes svix). Document the rationale near the overrides block.
3. **Cosmetic sourcemap warning** during api tests (`Sourcemap for .../node-cron/dist/esm/node-cron.js points to missing source files`) — upstream packaging issue in node-cron 4.2.1, nothing to fix here.

### SUGGESTION

1. Tighten audit gate to `--audit-level=moderate` after Expo SDK 56 lands.
2. Replace `react-native-markdown-display` to clear the last 2 moderates.

## 8. Follow-up Issues

Tracked under `.sdd/follow-ups/post-sprint1-audit.md`:

1. `refactor(api): remove redundant cron start() calls and fix misleading v4 auto-start comment`
2. `docs(deps): document why root overrides use flat syntax for svix`
3. `chore(deps): bump Expo SDK 55 → 56 and tighten audit gate to moderate`
4. `feat(mobile): replace react-native-markdown-display to clear markdown-it ReDoS`

## Final verdict

**APPROVE FOR MERGE WITH FOLLOW-UPS.**

The PR delivers exactly what the spec, design, and tasks promised: 2 highs eliminated, 17 moderates → 2 (accepted-risk and well-documented), 53/53 + 130/130 tests green, 196 warnings (= threshold), typecheck clean, format clean, audit gate live in CI. The two compatibility invariants (bcrypt hash format, cron schedules) hold. Three deviations were reviewed; none are CRITICAL. Follow-ups above are non-blocking quality improvements.

**(Merged 2026-04-29 as squash `354957b`.)**
