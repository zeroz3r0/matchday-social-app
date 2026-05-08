# Session: 2026-05-08 — Sprint 2 Phase 4 ship + follow-up tracking

> **type**: `session_summary`
> **status**: `archived`
> **last synced**: 2026-05-08

## Goal

User said "te acuerdas del proyecto de la app de futbol? mira en mi github,
recupera el contexto y dime en que punto esta la app y continuala", then
"dale al sprint dos y termina todo lo que tienes hacer", then "tienes
bypass en todo, cuando quieras preguntarme algo, primero revisa si tienes
acceso a responderte solo, sino solo escoge la opcion que mejor le venga
al proyecto. CAVEMAN activado btw". Translation: full autonomy, no
checkpoint questions, ship Sprint 2 to completion.

Target: close out Sprint 2 of the `web-bootstrap` change. Phase 1 (PR #22)
and Phase 3 (PR #23) had merged in the previous session (2026-05-06).
Phase 2 is gated on user-side pre-flights (Neon, Fly, DNS) and stays
deferred. Phase 4 (public pages + Vercel deploy) had been implemented on
`feat/web-bootstrap-phase-4-public-pages` but no PR was open against
master.

## Critical re-evaluation (orchestrator decision before shipping)

Before opening any PR, I delegated a verify-only sub-agent to confirm the
Phase 4 branch was actually shippable. The verify report (cached in this
session's notes, no SDD artifact written because there's no
`.sdd/changes/web-bootstrap/` directory — the SDD trail for this
multi-phase change lives in PRs #22, #23, #24) returned:

- **READY_TO_OPEN_PR** with caveats.
- All gates green: 73/73 shared, 130/130 api, 96/96 web, 4-workspace
  typecheck clean, web:build green (11 routes), lint at the documented
  196-warning baseline.
- One non-blocking: `npm run format:check` failed on 2 files
  (`.sdd/follow-ups/post-sprint1-audit.md` + `apps/web/README.md`) — but
  the verify confirmed those failures exist on bare master too. NOT a
  regression of Phase 4. Fix went to its own PR (#28) so PR #24's CI
  isn't reported as breaking.
- Two TDD discipline lapses (RegisterForm test+impl in same commit,
  no page-level tests for server components) — non-blocking, tracked
  as follow-up issues #25 and #26.

## Discoveries (technical)

- **Phase 4 was authored OUT OF ORDER against Phase 2** — the README
  explicitly notes Phase 2 (Fly+Neon+Vercel deploy) is gated on user
  pre-flights, so Phase 4 ships only the application code. The deploy
  switch is a single env var (`API_BASE_URL`) in Vercel once Phase 2
  unblocks. This pattern (BFF code-first, deploy-config later) is
  intentional and documented in `apps/web/README.md` lines 130-132.
- **Recurring archive sub-agent pattern**: the `sdd-archive` skill has
  now bypassed `format:check` on TWO occasions (PR #19 archive trail,
  and the `web-bootstrap` archive trail that never got generated
  because it'd have produced the same drift). Each occurrence requires
  a follow-up `style:` PR. Tracked as issue #27 — fix lives in the
  user-level skill prompt, not in this repo.
- **Local repo was severely out of sync at session start**: HEAD was on
  branch `feat/enable-web-target` at master commit `01e846b` (pre-PR
  #14). Stashed dirty working tree (the abandoned pre-Next.js attempt
  to enable web target on the React Native app), then fast-forwarded
  master 7 commits to `7b6d804`. Stash preserved as
  `wip-feat-enable-web-target-pre-sprint2-sync` for archaeological
  purposes — safe to drop at any time (the entire abandoned approach
  was superseded by the Next.js apps/web in PRs #22/#23/#24).
- **3 sibling open PRs from previous session were already merged**:
  the master fast-forward picked up #14, #15, #18, #19, #21, #22, #23
  — the previous session's tracker (`2026-05-02-issue-17-and-16-full-
sdd-cycle.md`) noted them as "still pending merge", but they all
  landed before this session started.

## Accomplished

- **PR #24 opened**: `feat(web): phase 4 — public pages, BFF-wired
forms, error boundaries (web-bootstrap)`. 15 commits on
  `feat/web-bootstrap-phase-4-public-pages`. Adds 6 public/dashboard
  routes, Header layout, Login/Register forms, publicApiFetch,
  CompetitionCard, Spanish 404/500 boundaries. All gates green except
  the pre-existing format:check on master.
- **PR #28 opened**: `style: prettier autofix on prior-merge .sdd
  - apps/web/README baseline drift`. Single commit, 2 files, +12/-12
    whitespace. Cleans master's format:check baseline so PR #24's CI
    isn't reported as broken.
- **Issue #25 created**: `test(web): add server-component page-level
tests for /, /login, /registro, /competiciones, /competiciones/[id],
/dashboard`. Tracks the README's "Phase 3+4 will colocate route-handler
  / page tests" promise.
- **Issue #26 created**: `test(web): retrofit RED-before-GREEN for
RegisterForm component`. Tracks the lone TDD lapse in PR #24.
- **Issue #27 created**: `chore(ci): tighten archive sub-agent prompt
to require npm run format before commit`. Tracks the recurring
  format-drift papercut at the orchestrator-skill layer.
- **Labels created**: `web` (#0075ca), `tdd` (#8a2be2). Used by
  issues #25 and #26.
- **Follow-up tracker updated**: `.sdd/follow-ups/post-sprint1-audit.md`
  gets a "Sprint 2 Phase 4 wrap-up" appendix mentioning the new issues
  #25/#26/#27.
- **This session summary written** to
  `.sdd/sessions/2026-05-08-sprint2-phase4-ship.md`.

## Next Steps

- **You (user)**: review and merge PR #28 first (smallest, lowest risk
  — pure formatting). Then PR #24 (Phase 4). GitHub will retarget
  cleanly.
- **After PR #24 merges**: someone should generate the
  `.sdd/archive/web-bootstrap/` directory with a 70-verify-report and
  a multi-phase apply-progress consolidating PRs #22, #23, #24. This
  was deferred from this session because the merge SHAs don't exist
  yet. Recommended approach: a fresh sub-agent run scoped to "synthesize
  archive trail from PRs #22/#23/#24 + write `.sdd/active-specs/web-
bootstrap.md`".
- **Phase 2 (Fly+Neon+Vercel deploy)**: still blocked on user-side
  pre-flights. When ready: provision Neon, provision Fly, set DNS for
  `api.matchday.app`, set Vercel project root to `apps/web`, set
  `API_BASE_URL` env var. Then Phase 4 is live.
- **Issue #16 (Expo SDK 56)**: still deferred — `npm view expo dist-tags`
  must show `sdk-56` as a non-canary tag before re-evaluating.
- **Manual smoke tests still pending** from Sprint 1: push notifications
  (PR #11) on real device with `EXPO_PUBLIC_PROJECT_ID` set; markdown
  renderer (PR #19) on iOS/Android sim for ToS + Privacy.
- **Local stash cleanup**: at any future session start, run
  `git stash drop "wip-feat-enable-web-target-pre-sprint2-sync"` if
  you don't need the archaeological reference.

## Relevant Files (this session)

- `.sdd/follow-ups/post-sprint1-audit.md` — appended Sprint 2 Phase 4
  wrap-up section (this session)
- `.sdd/sessions/2026-05-08-sprint2-phase4-ship.md` (new — this file)
- (no source files — pure orchestration session, all code work was
  delegated to sub-agents that operated on existing branches)

## Master state at session end

- master @ `7b6d804` (unchanged this session — all work landed on
  feature branches or in this docs branch)
- **3 open PRs**: #24 (Phase 4), #28 (format baseline), and this
  session-summary docs PR
- **4 open issues**: #16 (SDK 56, deferred), #25 (page tests), #26
  (RegisterForm TDD), #27 (archive prompt format step)
- branches local + remote:
  `feat/web-bootstrap-phase-4-public-pages` (15 commits, PR #24),
  `chore/format-baseline-master` (1 commit, PR #28),
  `docs/sdd-sprint2-phase4-session-summary` (this branch)
- working tree at session end: clean on this docs branch, will be
  pushed and PR'd as the final action

## Cross-machine sync state

Everything `.sdd/` written this session lives on
`docs/sdd-sprint2-phase4-session-summary`. Once that PR merges to
master, all session-summary + follow-up tracker updates are visible
to any machine. Two `#TBD-orchestrator-fill` placeholder patterns are
NOT used here — every PR/issue number was filled with the actual
references at write time. Merge SHAs intentionally absent (they don't
exist yet).
