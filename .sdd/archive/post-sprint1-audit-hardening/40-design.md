# Design: post-Sprint-1 dependency hardening

> **topic_key**: `sdd/post-sprint1-audit-hardening/design`
> **type**: `architecture`
> **status**: `archived`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

## Technical Approach

Six small, atomic commits inside one PR. Each commit independently passes `npm install` + `npm run test:shared` + `npm run test:api`. No app behavior changes — this is config + dependency hygiene only. Existing tests carry the regression load (Q1: "tests stay green across the bump" is acceptable evidence; no RED-before-GREEN).

Pre-flight findings (verified during this design pass by extracting `node-cron-4.2.1.tgz` and `npm view bcrypt@6 / svix@1.92.2`):

- `bcrypt@6.0.0` deps = `{ node-addon-api ^8.3.0, node-gyp-build ^4.8.4 }`. `@mapbox/node-pre-gyp` and `tar` removed entirely → both highs disappear in one bump. Engines: `node >= 18`. CI Linux/Node 20 → prebuilds available.
- `node-cron@4.2.1` re-exports `ScheduledTask` from entry. Existing `import cron, { ScheduledTask } from 'node-cron'` keeps compiling. **BUT `TaskOptions` no longer accepts `scheduled`** — that flag is dropped in v4. Current code calls `.start()` in `scheduler.ts:86-87`, so the v3 `{ scheduled: false }` option in `legalCronJobs.ts:104,116` becomes dead code → removed on the v4 commit.
- `svix@1.92.2` deps = `{ standardwebhooks: 1.0.0 }` — uuid gone. resend@6.12.2 pins svix `"1.90.0"` exact; npm overrides overwrite that.

> **Verify-phase correction (post-merge)**: Decision 2 was wrong about node-cron v4 NOT auto-starting. v4 DOES auto-start on `cron.schedule()`. The redundant `.start()` calls at `scheduler.ts:86-87` are idempotent no-ops (harmless). Tracked as follow-up #1. The cron-scheduling spec invariant ("schedules continue to fire") was preserved — only the rationale text in this design was inaccurate.

## Architecture Decisions

### Decision 1: bcrypt 5 → 6 instead of `tar` override

**Choice**: Bump `apps/api` `bcrypt ^5.1.1 → ^6.0.0`.
**Alternatives**: (B) `overrides: { tar: ^7.5.11 }` — `@mapbox/node-pre-gyp@1.0.11` peer is `tar@^6.4.0`; tar 7 is breaking → likely breaks bcrypt postinstall. (D) Accept — install-time-only, but blocks the audit gate.
**Rationale**: bcrypt 6 swaps `node-pre-gyp` for `node-addon-api`+`node-gyp-build` → kills entire vulnerable subtree. API surface (`hash`, `compare`) unchanged → existing `$2a$/$2b$` hashes from v5 verify correctly with v6 → **no forced password reset for existing users (CRITICAL invariant)**. `auth.test.ts` + `passwordReset.test.ts` cover all call sites.

### Decision 2: node-cron 3 → 4 instead of uuid override

**Choice**: Bump `apps/api` `node-cron ^3.0.3 → ^4.2.1` AND drop `{ scheduled: false }` from `legalCronJobs.ts`.
**Alternatives**: (B) `overrides: { "node-cron > uuid": "^14" }` — uuid 8→14 API differences; node-cron v3 calls `require('uuid').v4()`, untested under override.
**Rationale**: node-cron@4.2.1 has zero deps. `ScheduledTask` type still exported. Five call sites preserved. `{ scheduled: false }` removal is mandatory because v4 `TaskOptions` doesn't include the key.

### Decision 3: drop `@expo/ngrok` (not override)

**Choice**: Remove `"@expo/ngrok": "^4.1.3"` from `apps/mobile/package.json`.
**Rationale**: Per Q2, zero usages in source/scripts/CI/docs. Cleaner than carrying unused dep through override. Re-add in one line if tunnel mode ever needed.

### Decision 4: scoped npm overrides at root (not flat) — REVISED IN APPLY

**Original choice**: Nested override syntax in root `package.json`.
**Apply-phase correction**: nested overrides for workspace-child deps were silently ignored by npm 11. Final shipped form was flat `svix`, range-scoped `postcss<8.5.10`, nested `xcode > uuid`. See `.sdd/discoveries/npm-overrides-workspaces.md`. Spec was silent on syntax, so this is not an invariant violation.

### Decision 5: CI audit gate at `--audit-level=high`, hard-fail, post-`npm ci`

**Choice**: New step `Security audit (high+)` in existing `test` job, after `npm ci`, before `prisma generate`. `run: npm audit --audit-level=high`. No `continue-on-error`.
**Alternatives**: `moderate` (fails today on Expo 55 noise); place after tests (wastes CI minutes); soft-fail (defeats gate).
**Rationale**: Post-fix state = 0 high → gate passes. Catches regressions of the bcrypt/tar class. Fail-fast saves CI minutes. Re-tighten to `moderate` once Expo SDK 56 lands (separate proposal).

### Decision 6: 6-commit decomposition (mitigates lockfile churn)

**Choice**: Six commits, each individually green:

1. `chore(api): bump bcrypt 5→6 (drops node-pre-gyp + tar)`
2. `chore(api): bump node-cron 3→4 (drops uuid)` — also removes `{ scheduled: false }` option
3. `chore(mobile): drop unused @expo/ngrok dep`
4. `chore(deps): root overrides for resend>svix, xcode>uuid, metro-config>postcss`
5. `ci: add npm audit --audit-level=high gate`
6. `chore(api): regenerate package-lock.json` (only if separate lockfile-only commit needed; usually folded in)

**Apply-phase**: commit 6 was correctly folded into commit 4 (lockfile churn fully absorbed there).

### Decision 7: Windows local-dev bcrypt 6 — document, don't fork

**Choice**: PR body adds a "Local Windows dev" note: if `npm install` fails to fetch prebuilt bcrypt binary, run `npm rebuild bcrypt` or use WSL.
**Alternatives**: Add `bcryptjs` as Windows-only dev fallback (different package, different hash format → would corrupt any local-DB hashes written under it). Hard reject.
**Rationale**: bcrypt 6 ships prebuilds for Linux/macOS/Windows on Node 18/20/22. Edge case is non-x64 Windows; `node-gyp-build` falls back to local compile (needs MSVC/Python). Documenting suffices. CI is Linux → not blocked.

## Data Flow (CI audit gate)

```
push/PR ─→ checkout ─→ setup-node@20 ─→ npm ci ─→ npm audit --audit-level=high
                                                       │
                                          ┌────────────┴────────────┐
                                          │                         │
                                     exit 0 → continue        exit ≠ 0 → CI red (hard fail)
                                          │                         │
                                   prisma generate                STOP
                                          │
                                   shared:build → test (53/53 + 130/130)
```

## File Changes

| File                                           | Action | Description                                                                                                                    |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/package.json`                        | Modify | `bcrypt ^5.1.1 → ^6.0.0`, `node-cron ^3.0.3 → ^4.2.1`                                                                          |
| `apps/api/src/jobs/legalCronJobs.ts`           | Modify | Remove `{ scheduled: false }` 3rd arg from both `cron.schedule(...)` calls. `.start()` already explicit at scheduler.ts:86-87. |
| `apps/mobile/package.json`                     | Modify | Remove `"@expo/ngrok": "^4.1.3"` line                                                                                          |
| `package.json` (root)                          | Modify | Add `overrides` block                                                                                                          |
| `package-lock.json`                            | Modify | Regenerated by `npm install`; large churn                                                                                      |
| `.github/workflows/ci.yml`                     | Modify | Insert `Security audit (high+)` step in `test` job after `npm ci`                                                              |
| `apps/api/src/__tests__/auth.test.ts`          | Verify | No change. Must stay green under bcrypt@6.                                                                                     |
| `apps/api/src/__tests__/passwordReset.test.ts` | Verify | No change. Must stay green under bcrypt@6.                                                                                     |

## Interfaces / Contracts

No new interfaces. Verified preserved:

```ts
// bcrypt v6 — same shape
import bcrypt from 'bcrypt';
bcrypt.hash(plain: string, rounds: number): Promise<string>;
bcrypt.compare(plain: string, hash: string): Promise<boolean>;
// Hash format $2a$ / $2b$ from v5 reads correctly under v6.

// node-cron v4 — exports preserved, options narrowed
import cron, { ScheduledTask } from 'node-cron';
cron.schedule(expr: string, fn: TaskFn): ScheduledTask;
// TaskOptions: { timezone?, name?, noOverlap?, maxExecutions?, maxRandomDelay? }
//   ⚠ NO `scheduled` key — v4 tasks auto-start on schedule().
// ScheduledTask.start(): void | Promise<void>
// ScheduledTask.stop():  void | Promise<void>
```

## Testing Strategy

| Layer                 | What to Test                                                                                   | Approach                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Unit (api)            | bcrypt hash/compare round-trip, password reset flow                                            | Existing `auth.test.ts` + `passwordReset.test.ts` (130/130 green per commit) |
| Unit (shared)         | unchanged                                                                                      | `test:shared` (53/53 green per commit)                                       |
| Smoke (cron)          | `cron.schedule(...)` returns object with callable `.start()/.stop()`; `ScheduledTask` resolves | Compile-time via `tsc --noEmit -p apps/api/tsconfig.json`                    |
| Smoke (svix override) | resend `emails.send(...)` doesn't throw under svix@1.92.2                                      | Manual password-reset trigger in dev                                         |
| CI                    | audit gate exits 0 on green branch                                                             | First push of audit-gate commit turns run green                              |
| Lint/Typecheck        | unchanged                                                                                      | `npm run lint` (≤ 196 warnings), `npm run typecheck` (3 workspaces clean)    |

Per-commit verification command:

```bash
npm install && npm run shared:build && npm run test:shared && npm run test:api && npm run typecheck
```

## Migration / Rollout

- **No DB migration.** No schema/data-shape changes.
- **No password reset for existing users.** bcrypt 6 reads v5 hashes natively (`$2a$/$2b$` unchanged).
- **No feature flag.** Rollout = merge → next deploy picks up new lockfile.
- **Rollback**: per-commit `git revert`. Full: `git revert <merge-sha> && npm ci`. CI audit step is additive — safe to remove.

## Risks

| Risk                                                               | Likelihood     | Impact                              | Mitigation                                                                                                            |
| ------------------------------------------------------------------ | -------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| bcrypt@6 binary fails on local Windows dev                         | Low            | Dev friction, not prod              | Document `npm rebuild bcrypt` / WSL. CI is Linux.                                                                     |
| node-cron@4 `{ scheduled: false }` silently ignored if not removed | Low            | Could double-fire in tests          | Designed out: commit 2 explicitly removes the option. Test mode in `scheduler.ts:84` skips `registerLegalCronJobs()`. |
| svix@1.92.2 breaks resend's webhook signing                        | Low            | Email send fails                    | Minor bump (1.90→1.92). svix dropped uuid for `standardwebhooks`; signing API stable.                                 |
| postcss@8.5.10 override breaks Expo metro bundling                 | Low            | Mobile bundle build fails locally   | postcss is build-time only (not shipped to RN bundle). Verify via `npm run mobile:start` once.                        |
| npm overrides + workspaces edge case                               | Med (REALIZED) | Override doesn't propagate          | Verify post-install via `npm ls postcss svix uuid`. **Realized in apply** — see Decision 4 correction.                |
| Lockfile churn obscures review                                     | Med            | Reviewer fatigue                    | 6-commit decomposition.                                                                                               |
| Audit gate flaky if moderate gets reclassified to high mid-PR      | Low            | Red CI from upstream advisory shift | `--audit-level=high` is intentional. New high = gate working as designed.                                             |

## Open Questions

None. The two questions surfaced in the launch brief are resolved:

- ✅ `node-cron@4.2.1` `ScheduledTask` IS still exported. Code-side change required: remove `{ scheduled: false }` (TaskOptions narrowed in v4).
- ✅ Windows bcrypt 6 fallback: document (`npm rebuild bcrypt` or WSL). Do NOT fork to `bcryptjs` (incompatible hash format → corrupts local DB hashes).
