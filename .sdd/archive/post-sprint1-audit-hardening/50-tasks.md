# Tasks: post-Sprint-1 dependency hardening — COMPLETE

> **topic_key**: `sdd/post-sprint1-audit-hardening/tasks`
> **type**: `architecture`
> **status**: `archived`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

**PR**: https://github.com/zeroz3r0/matchday-social-app/pull/12
**Branch**: `chore/post-sprint1-audit-hardening` (5 commits, deleted post-merge)

## Phase 0: Setup ✅

- [x] 0.1 Clean tree on master `2100e7f`
- [x] 0.2 Branch created
- [x] 0.3 Baseline audit captured

## Phase 1: Sequential commits ✅ (gate green on each)

- [x] 1.1 `630ad18` — `chore(api): bump bcrypt 5 to 6 (drops node-pre-gyp + tar)`
- [x] 1.2 `2221a12` — `chore(api): bump node-cron 3 to 4 and drop scheduled:false TaskOption`
- [x] 1.3 `15466fd` — `chore(mobile): drop unused @expo/ngrok dep`
- [x] 1.4 `70205eb` — `chore(deps): root overrides for svix, xcode>uuid, postcss`
- [x] 1.5 `c08da4e` — `ci: add npm audit --audit-level=high gate`
- [N/A] 1.6 — conditional lockfile commit, not needed (folded into 1.4)

## Phase 2: Final verification ✅

- [x] 2.1 Final gate green: 53/53 + 130/130 + typecheck clean
- [x] 2.2 Audit delta: root 19→2 (0h/2m), api 6→0, mobile 14→2, shared 0→0
- [x] 2.3 Lint: 196 warnings, 0 errors (= threshold)
- [x] 2.4 format:check clean
- [x] 2.5 PR body built

## Phase 3: Open PR ✅

- [x] 3.1 Branch pushed to origin
- [x] 3.2 PR #12 opened

## Phase 4: Merge ✅

- [x] 4.1 PR #12 squash-merged into master as `354957b`
- [x] 4.2 Branch `chore/post-sprint1-audit-hardening` deleted local + remote

## Per-commit gate (mandatory after every Phase 1 commit)

```bash
npm install && npm run shared:build && npm run test:shared && npm run test:api && npm run typecheck
```

If any step failed → STOP. Do NOT proceed to next commit. Do NOT amend. Save progress and report failure.

## Guardrails respected

- All 5 commits authored by `zeroz3r0 <119344894+zeroz3r0@users.noreply.github.com>`.
- Conventional commits, lowercase verbs, no emoji, no AI attribution, no Co-Authored-By.
- No commits amended after the gate ran green.
- No force push.

See `60-apply-progress.md` for full deviation/file/notes details.
