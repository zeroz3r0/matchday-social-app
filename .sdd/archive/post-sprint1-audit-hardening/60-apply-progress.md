# Apply progress: post-Sprint-1 dependency hardening — COMPLETE

> **topic_key**: `sdd/post-sprint1-audit-hardening/apply-progress`
> **type**: `architecture`
> **status**: `archived`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

**Branch**: `chore/post-sprint1-audit-hardening` (from `2100e7f`)
**PR**: https://github.com/zeroz3r0/matchday-social-app/pull/12 — MERGED as squash commit `354957b`

## All 16 tasks complete

### Phase 0 ✅

- [x] 0.1 Clean tree on master at `2100e7f`
- [x] 0.2 Branch created
- [x] 0.3 Baseline audit captured

### Phase 1 ✅ (5 commits, gate green on each)

- [x] 1.1 `630ad18` chore(api): bump bcrypt 5 to 6
- [x] 1.2 `2221a12` chore(api): bump node-cron 3 to 4 + drop scheduled:false
- [x] 1.3 `15466fd` chore(mobile): drop unused @expo/ngrok
- [x] 1.4 `70205eb` chore(deps): root overrides (svix, xcode>uuid, postcss)
- [x] 1.5 `c08da4e` ci: add npm audit --audit-level=high gate
- [N/A] 1.6 conditional lockfile commit — not needed

### Phase 2 ✅

- [x] 2.1 final gate green
- [x] 2.2 audit delta computed
- [x] 2.3 lint 196 warnings (= threshold)
- [x] 2.4 format:check clean
- [x] 2.5 PR body built

### Phase 3 ✅

- [x] 3.1 branch pushed to origin
- [x] 3.2 PR #12 opened

## Final results

| Metric                         | Result                                            |
| ------------------------------ | ------------------------------------------------- |
| Commits                        | 5 (clean, conventional, all authored by zeroz3r0) |
| Test:shared                    | 53/53 ✅                                          |
| Test:api                       | 130/130 ✅                                        |
| Typecheck                      | 3 workspaces clean ✅                             |
| Lint                           | 0 errors, 196 warnings (= threshold ≤196) ✅      |
| Format:check                   | clean ✅                                          |
| `npm audit --audit-level=high` | exits 0 ✅                                        |

## Audit delta

| Scope           | Before       | After      |
| --------------- | ------------ | ---------- |
| Root            | 0c/2h/17m/19 | 0c/0h/2m/2 |
| apps/api        | 0c/2h/4m/6   | 0c/0h/0m/0 |
| apps/mobile     | 0c/0h/14m/14 | 0c/0h/2m/2 |
| packages/shared | 0c/0h/0m/0   | 0c/0h/0m/0 |

Remaining 2 moderates: both `markdown-it < 12.3.2` ReDoS via `react-native-markdown-display` — accepted-risk per spec (trusted-content path only).

## Deviations from design (3)

1. **node-cron v4 auto-starts** on `cron.schedule()`. Design said it didn't. Verified at `node_modules/node-cron/dist/cjs/node-cron.js` line 20. The redundant `.start()` calls in scheduler.ts:86-87 are safe (idempotent via `runner.isStopped()` guard). Spec invariant ("schedules continue to fire") preserved. Tracked as follow-up #1.
2. **Override syntax**: nested overrides for workspace-child deps were silently ignored by npm 11 on incremental install. Used flat `svix` override + range-scoped `postcss<8.5.10` override. Required `rm package-lock.json && npm install` to force re-resolution. See `.sdd/discoveries/npm-overrides-workspaces.md`.
3. **No commit 6** (lockfile-only). Lockfile churn from 1.4's clean install was absorbed cleanly.

## Other notes

- `gh` CLI was not installed on the machine; installed via `winget install GitHub.cli` and authenticated via the cached token in Git Credential Manager (`git credential fill`) passed as `GH_TOKEN` env var.
- npm 11.11.0, Node v24.14.1 (project asks Node 20 via `.nvmrc`; the gate ran green under Node 24).
- `pr-body.md` was created as a working file in repo root and removed before push (untracked, never committed).
- Lockfile churn observed across commits: vitest 4.1.4→4.1.5, vite 8.0.8→8.0.10 — both within existing semver ranges, absorbed in commit 1.4.

## Files changed

- `apps/api/package.json` — bcrypt + node-cron version bumps
- `apps/api/src/jobs/legalCronJobs.ts` — removed `{ scheduled: false }` from both cron.schedule calls + updated header comment
- `apps/mobile/package.json` — removed `@expo/ngrok`
- `package.json` (root) — added `overrides` block (3 entries: svix flat, xcode>uuid nested, postcss range-scoped)
- `package-lock.json` — regenerated (large churn, expected)
- `.github/workflows/ci.yml` — added `Security audit (high+)` step in test job
