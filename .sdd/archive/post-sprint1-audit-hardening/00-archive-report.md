# Archive Report: post-Sprint-1 dependency hardening

> **topic_key**: `sdd/post-sprint1-audit-hardening/archive-report`
> **type**: `architecture`
> **status**: `archived`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

**Change**: `post-sprint1-audit-hardening`
**Mode**: engram + `.sdd/` mirror
**Status**: archived
**Merged**: 2026-04-29 — PR [#12](https://github.com/zeroz3r0/matchday-social-app/pull/12), squash commit `354957b`
**Branch**: `chore/post-sprint1-audit-hardening` — deleted local + remote post-merge
**Master at archive**: `354957b chore(security): post-Sprint-1 dependency hardening (#12)`

---

## What

Closed the Sprint-1 audit gap (19 root vulns: 0c / 2h / 17m → 2 root vulns: 0c / 0h / 2m) and locked the result in CI with a `--audit-level=high` gate that hard-fails the build on any new high or critical advisory. Also captured two compatibility invariants in the spec (bcrypt 5→6 preserves `$2b$` hash format; node-cron 3→4 preserves all 5 schedules) so future changes don't silently break those trust boundaries.

## Why

PR #11 left the tree at 19 vulns. Without a CI gate, the next dependency change could regress that without anyone noticing — the same way Sprint 1 didn't notice the `tar`+`@mapbox/node-pre-gyp` chain creeping in via `bcrypt@5`. This change is the audit follow-up plus the regression lock.

## Where

| File                                 | Change                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/package.json`              | `bcrypt ^5.1.1 → ^6.0.0`, `node-cron ^3.0.3 → ^4.2.1`                                                                               |
| `apps/api/src/jobs/legalCronJobs.ts` | Removed `{ scheduled: false }` from both `cron.schedule()` calls (option dropped in node-cron v4) + header comment update           |
| `apps/mobile/package.json`           | Removed unused `@expo/ngrok` dep                                                                                                    |
| `package.json` (root)                | Added `overrides` block: flat `svix`, range-scoped `postcss<8.5.10`, nested `xcode > uuid`                                          |
| `package-lock.json`                  | Regenerated                                                                                                                         |
| `.github/workflows/ci.yml`           | Added `Security audit (high+)` step (`npm audit --audit-level=high`, no continue-on-error) after `npm ci`, before `prisma generate` |

5 commits squashed to `354957b`:

1. `630ad18` `chore(api): bump bcrypt 5 to 6 (drops node-pre-gyp + tar)`
2. `2221a12` `chore(api): bump node-cron 3 to 4 and drop scheduled:false TaskOption`
3. `15466fd` `chore(mobile): drop unused @expo/ngrok dep`
4. `70205eb` `chore(deps): root overrides for svix, xcode>uuid, postcss`
5. `c08da4e` `ci: add npm audit --audit-level=high gate`

## Verdict (from verify phase)

**APPROVE FOR MERGE WITH FOLLOW-UPS** — all 7 spec acceptance criteria green, both compatibility invariants preserved, design fidelity high (5/6 commits matched; commit 6 was conditional and correctly folded), all 16 tasks complete. Three apply-phase deviations classified as WARNING or ACCEPTABLE; none CRITICAL.

### Final metrics at merge

| Metric                             | Result                                                |
| ---------------------------------- | ----------------------------------------------------- |
| `npm audit --audit-level=high`     | exit 0 ✅ (root: 2m only — accepted-risk markdown-it) |
| `npm run test:shared`              | 53/53 ✅                                              |
| `npm run test:api`                 | 130/130 ✅                                            |
| `npm run typecheck` (3 workspaces) | clean ✅                                              |
| `npm run lint`                     | 0 errors, 196 warnings (= threshold) ✅               |
| `npm run format:check`             | clean ✅                                              |

### Audit delta (root → root)

- Critical: 0 → 0
- High: **2 → 0** ✅
- Moderate: 17 → 2 (both accepted-risk: markdown-it ReDoS via `react-native-markdown-display` in trusted-content path)
- Total: **19 → 2**

## Deviations from design (3, all reviewed)

1. **node-cron v4 auto-starts on `cron.schedule()`** — Design Decision 2 said it didn't. Reality: v4 does. Redundant `.start()` calls at `scheduler.ts:86-87` are idempotent no-ops. Spec invariant ("schedules continue to fire") preserved. Severity: WARNING. Tracked in follow-ups #1.
2. **Override syntax revised mid-apply** — npm 11 silently ignored nested overrides for workspace-child deps. Final form: flat `svix`, range-scoped `postcss`, nested only `xcode > uuid`. Spec is silent on syntax; only requires audit gate exits 0 (it does). Severity: WARNING. Documented as `discoveries/npm-overrides-workspaces.md`. Tracked in follow-ups #2.
3. **No commit 6 (lockfile-only)** — Design Decision 6 explicitly allowed folding the lockfile commit into commit 4 ("usually folded in"). Severity: ACCEPTABLE.

## Spec sync (delta → main spec body)

The delta from this change's spec was promoted to three main capability specs (each is the source of truth for that capability going forward; they reference the merge commit and replace any prior implicit/oral spec):

| Capability        | Action                                                     | Active-spec file                       |
| ----------------- | ---------------------------------------------------------- | -------------------------------------- |
| `cicd`            | CREATED                                                    | `.sdd/active-specs/cicd.md`            |
| `auth`            | UPDATED — added bcrypt hash-format compatibility invariant | `.sdd/active-specs/auth.md`            |
| `cron-scheduling` | UPDATED — added node-cron schedule-firing invariant        | `.sdd/active-specs/cron-scheduling.md` |

For `auth` and `cron-scheduling`, the new active specs are scoped intentionally to **invariants only** — the project did not have a prior consolidated capability spec at this granularity, so the delta IS the body. Future behavioral specs for these capabilities should append, not replace, the invariants captured here.

## Artifact map

| Phase            | File                                            | Engram ID (legacy)                                    |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------- |
| explore          | `10-explore.md`                                 | #10 (filed under `minibrawlroyale` due to cwd gotcha) |
| proposal         | `20-proposal.md`                                | #11                                                   |
| spec (delta)     | `30-spec.md`                                    | #12                                                   |
| design           | `40-design.md`                                  | #13                                                   |
| tasks            | `50-tasks.md`                                   | #14                                                   |
| apply-progress   | `60-apply-progress.md`                          | #15                                                   |
| verify-report    | `70-verify-report.md`                           | #18                                                   |
| archive-report   | `00-archive-report.md` (this)                   | #23                                                   |
| (side discovery) | `../../discoveries/npm-overrides-workspaces.md` | #16 (kept active, not archived)                       |
| follow-ups       | `../../follow-ups/post-sprint1-audit.md`        | #22                                                   |

## Learned

- **bcrypt 5 → 6 is a free win** when you have a clean test suite. Hash format `$2b$` survives the bump intact, so no DB migration / rehash needed. The `@mapbox/node-pre-gyp` + `tar` chain disappears entirely (kills both highs in one commit).
- **node-cron 4 has zero deps** and re-exports `ScheduledTask`. Drop `{ scheduled: false }` (option removed in v4); v4 auto-starts on `cron.schedule()` regardless of design predictions — verify upstream behavior at `node_modules/<pkg>/dist/.../*.js` before committing rationale.
- **npm 11 + workspaces + nested overrides is unreliable on incremental install.** Real fix: `rm package-lock.json && npm install`. Prefer flat or range-scoped overrides for workspace-child deps.
- **CI audit gate at `high`, not `moderate`,** is the right starting point when there's a known accepted-risk floor. Tightening to `moderate` is its own SDD proposal because it requires revising the spec scenario "Moderate-and-below do not block."

## Follow-ups

4 items recorded under `.sdd/follow-ups/post-sprint1-audit.md` for next-session triage. NOT yet opened as GitHub issues.
