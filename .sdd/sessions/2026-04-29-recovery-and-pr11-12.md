# Session: 2026-04-29 — context recovery + PR #11 + PR #12

> **type**: `session_summary`
> **status**: `archived`
> **last synced**: 2026-04-29

## Goal

Recover full context of `matchday-social-app` (zeroz3r0/matchday-social-app) on a fresh machine and continue the work — close Sprint 1 and run a full SDD cycle for whatever came next.

## Instructions / user directives

- User runs the project under `zeroz3r0` GitHub account but the local git config on this machine is `funeemonkee`. All commits to this repo MUST use `git -c user.name='zeroz3r0' -c user.email='119344894+zeroz3r0@users.noreply.github.com' commit ...`.
- User explicit directive: "no me preguntes mierdas" / "te doy bypass en todo" — do not gate work on user confirmation. Pre-decide reasonable open questions and document the decision.
- User wants identical work continuity across all of their machines → **the `.sdd/` folder convention was established at the end of this session as the cross-machine source of truth.**

## Discoveries (technical / operational)

- **Project context lives in another account's Engram**, not this machine's. Past PRs reference engram observation IDs (#188, #199, #237, etc.) from `zeroz3r0`'s machine — DO NOT try to resolve them locally. Bootstrap context from PR bodies + code + (going forward) `.sdd/`.
- **Engram cwd-resolution gotcha**: even when sub-agents pass `project: matchday-social-app` explicitly, the engram MCP resolves project from cwd via git_child detection at write time and routes observations to the wrong project. Workaround: use unique `topic_key`s — cross-project search recovers them. **The `.sdd/` folder is the structural fix to this for cross-machine continuity.**
- **`gh` CLI was not installed**; sub-agent installed via `winget install GitHub.cli` and used `GH_TOKEN` env var with the cached Git Credential Manager token.
- **node-cron v4 auto-starts on `cron.schedule()`** — contrary to v3 behavior. Existing `.start()` calls are now redundant idempotent no-ops.
- **npm 11 silently drops nested overrides for workspace-child deps** on incremental install — fix: `rm package-lock.json && npm install`. Saved as standalone discovery.
- **bcrypt 6 reads $2a$/$2b$ hashes from v5 unchanged** — verified at runtime via the existing 130/130 api tests passing under bcrypt 6 with v5-format mock hashes.
- **`@expo/ngrok` was dead code** — zero usages in source/scripts/CI/docs. Dropped entirely.
- **Repo's prior "audit pass post-Sprint 1" deferred concern about `archiver` was OBSOLETE** — `archiver@7.0.1` no longer surfaces in `npm audit`.
- Final root vuln count: **19 → 2** (both remaining are accepted-risk markdown-it ReDoS in trusted internal content only).

## Accomplished

- ✅ Earlier in session: fixed Sonar audio issue (Arctis Nova 5 USB endpoint at 11% — reset to 100%; Hands-Free PnP-disable from previous day held).
- ✅ Cloned `zeroz3r0/matchday-social-app` and recovered full context from PR bodies (#1-#11) + README.
- ✅ **Merged PR #11** (Expo Push notifications) — squashed to commit `2100e7f` on master. Verified locally first via delegated full install + tests + lint + typecheck.
- ✅ Initialized SDD context for matchday-social-app via `sdd-init`.
- ✅ **Full SDD cycle completed for change `post-sprint1-audit-hardening`**:
  - explore → proposal → spec → design → tasks → apply-progress → verify-report → archive-report.
  - Synced delta specs to capability bodies: `cicd` (new audit gate requirement), `auth` (bcrypt invariant), `cron-scheduling` (cron firing invariant).
- ✅ **Merged PR #12** (post-Sprint-1 dependency hardening) — squashed to commit `354957b` on master. Audit gate now wired in CI at `--audit-level=high`.
- ✅ **Created `.sdd/` folder convention** as cross-machine source of truth for SDD artifacts. All Engram observations from this session mirrored to markdown files committed to the repo.
- 🔲 Four follow-ups identified by verify but NOT opened as issues yet (tracked in `.sdd/follow-ups/post-sprint1-audit.md`).
- 🔲 Manual smoke test of push notifications (PR #11) — requires user's hands (real device + `EXPO_PUBLIC_PROJECT_ID` set up + Expo dev client).

## Next Steps

- On the next session (any machine), read `.sdd/README.md` first, then `.sdd/project-context.md`, then this file, then `.sdd/follow-ups/post-sprint1-audit.md`.
- Open the 4 follow-up issues from PR #12 verify.
- User-driven: smoke-test push notifications end-to-end on a real device.
- Consider Sprint 2 planning via `/sdd-explore` once user has a target topic in mind.
- Tooling caveat to fix when convenient: engram MCP cwd-based project resolution overrides explicit `project` param at write time. File upstream.

## Relevant Files

- `apps/api/package.json` — bcrypt ^6.0.0, node-cron ^4.2.1
- `apps/api/src/jobs/legalCronJobs.ts` — `{scheduled:false}` removed from cron.schedule calls
- `apps/api/src/jobs/scheduler.ts` — 5 schedules verified firing post-bump
- `package.json` (root) — `overrides` block: svix flat, xcode>uuid nested, postcss range-scoped
- `apps/mobile/package.json` — `@expo/ngrok` removed
- `.github/workflows/ci.yml` — Security audit (high+) step active
- `.sdd/` — entire folder, bootstrapped this session

## Master state at session end

- master @ `354957b` (will become a different SHA once `.sdd/` PR merges)
- 0 open PRs (before opening the `.sdd/` PR)
- 0 stale local branches (before creating `chore/sdd-context-export`)
- working tree clean (before `.sdd/` writes)
