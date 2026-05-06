# Follow-ups from PR #12 (post-Sprint-1 audit hardening)

> **topic_key**: `matchday-social-app/follow-ups/post-sprint1-audit`
> **type**: `discovery`
> **status**: 3 of 4 closed; remaining 1 partially resolved (audit-gate half done via PR #20, SDK 56 bump deferred)
> **last synced**: 2026-05-06 — items #1, #2, #4 closed via PRs #14, #15, #19; item #3 split — gate-tightening covered by PR #20, SDK 56 bump remains in issue #16.

**Source change**: `post-sprint1-audit-hardening` (PR #12, merge commit `354957b`)
**Identified by**: verify phase (`.sdd/archive/post-sprint1-audit-hardening/70-verify-report.md`)

---

## 1. `refactor(api): remove redundant cron start() calls and fix misleading v4 auto-start comment`

- **Status**: ✅ **CLOSED** by PR #14 (merged 2026-05-06)
- **Source**: verify report Warning 1 / Deviation 1
- **What was done**: Dropped the two redundant `.start()` calls in `apps/api/src/jobs/scheduler.ts` and the unused `legalJobs` binding (since `registerLegalCronJobs()` is now called for side-effect only). Rewrote the comment block in `apps/api/src/jobs/legalCronJobs.ts` to state the correct v4 auto-start behavior and explain why `ScheduledTask` handles are still returned (for future graceful-shutdown wiring). Added a mirror comment at the call site.
- **Verification**: 130/130 api tests green, 53/53 shared tests green, typecheck clean, lint at 196 warnings (= cap), format clean.

## 2. `docs(deps): document why root overrides use flat syntax for svix`

- **Status**: ✅ **CLOSED** by PR #15 (merged 2026-05-06)
- **Source**: verify report Warning 2 / Deviation 2
- **What was done**: Created a new `SECURITY.md` (66 lines) at the repo root. Documents (a) vuln reporting via private GitHub Security Advisory, (b) the CI `npm audit` policy (current gate at `--audit-level=high`), and (c) a table explaining why each entry in the root `package.json` `overrides` uses its specific form (flat `svix`, nested `xcode > uuid`, range-scoped `postcss@<8.5.10`), plus the workflow for adding a new override (lockfile regen + `npm ls` verification + the "expected `invalid`" note).
- **Why SECURITY.md**: GitHub auto-discovers it and surfaces it on the Security tab; CONTRIBUTING.md doesn't exist yet; `package.json` doesn't accept comments.
- **Cross-refs**: links back to `.sdd/discoveries/npm-overrides-workspaces.md` and PR #12.

## 3. `chore(deps): bump Expo SDK 55 → 56 and tighten audit gate to moderate`

- **Status**: 🟡 **PARTIALLY RESOLVED** — split into two halves:
  - **Audit-gate tightening (`high` → `moderate`)**: ✅ READY via PR #20 (stacked on #19). Since #19 cleared the last 2 moderates from the root tree (markdown-it ReDoS chain), the gate can tighten with no SDK bump.
  - **Expo SDK 55 → 56 bump**: 🟡 DEFERRED — Expo SDK 56 is canary-only as of 2026-05-02; latest stable is 55.0.19. Issue #16 stays open for this half until SDK 56 stabilizes and an upgrade plan is drafted.
- **Source**: verify report Suggestion 1 + design Decision 5 (post-sprint1-audit-hardening)
- **Severity**: SUGGESTION (nice-to-have)
- **Effort**: gate tightening = trivial (PR #20); SDK 56 bump = medium-large, deferred.

## 4. `feat(mobile): replace react-native-markdown-display to clear markdown-it ReDoS`

- **Status**: ✅ **CLOSED** by PR #19 (escalated to issue #17, resolved via dedicated SDD change `replace-react-native-markdown-display`).
- **Source**: verify report Suggestion 2
- **What was done**: Replaced `react-native-markdown-display@7.0.2` with a three-layer architecture: `marked@^18` (parse, zero deps) → `packages/shared/src/markdown/` (pure transform, strict TDD with Vitest) → `apps/mobile/src/components/MarkdownRenderer.tsx` (thin RN presentation layer). New capability spec at `.sdd/active-specs/legal-markdown-rendering.md`. Full SDD trail under `.sdd/archive/replace-react-native-markdown-display/`.
- **Audit delta**: 2 root moderates → 0 (-100%). `npm audit --audit-level=moderate` now exits 0.
- **Severity**: SUGGESTION (nice-to-have, not exploitable in current trusted-content path)
- **Effort**: medium — UI library swap, regression-test markdown rendering on mobile

---

## Status summary as of 2026-05-06

| #   | Title                      | Status                       | Closed by                          |
| --- | -------------------------- | ---------------------------- | ---------------------------------- |
| 1   | cron `start()` cleanup     | ✅ closed                    | PR #14                             |
| 2   | overrides syntax docs      | ✅ closed                    | PR #15                             |
| 3   | Expo SDK 56 + tighten gate | 🟡 partial (gate via PR #20) | PR #20 (gate); issue #16 (SDK 56)  |
| 4   | replace markdown-it lib    | ✅ closed                    | PR #19                             |

This file can be archived to `.sdd/archive/post-sprint1-audit-hardening/80-followups-resolution.md` once PR #20 merges and the Expo SDK 56 bump (remaining half of issue #16) is resolved or formally deferred indefinitely.

## User-driven (not in this list because it's operational, not a code change)

- **Manual smoke test of push notifications** (PR #11). Requires: real device, `EXPO_PUBLIC_PROJECT_ID` set, Expo dev client. Walks through the 6-step list in PR #11's "Manual smoke" section. Still pending user execution.
