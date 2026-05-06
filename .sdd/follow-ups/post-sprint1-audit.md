# Follow-ups from PR #12 (post-Sprint-1 audit hardening)

> **topic_key**: `matchday-social-app/follow-ups/post-sprint1-audit`
> **type**: `discovery`
> **status**: `active` (2 of 4 closed; remaining 2 deferred to dedicated issues)
> **last synced**: 2026-05-02 — items #1 and #2 closed via PRs #14 and #15; items #3 and #4 escalated to issues #16 and #17.

**Source change**: `post-sprint1-audit-hardening` (PR #12, merge commit `354957b`)
**Identified by**: verify phase (`.sdd/archive/post-sprint1-audit-hardening/70-verify-report.md`)

---

## 1. `refactor(api): remove redundant cron start() calls and fix misleading v4 auto-start comment`

- **Status**: ✅ **CLOSED** by PR #14 (2026-05-02)
- **Source**: verify report Warning 1 / Deviation 1
- **What was done**: Dropped the two redundant `.start()` calls in `apps/api/src/jobs/scheduler.ts` and the unused `legalJobs` binding (since `registerLegalCronJobs()` is now called for side-effect only). Rewrote the comment block in `apps/api/src/jobs/legalCronJobs.ts` to state the correct v4 auto-start behavior and explain why `ScheduledTask` handles are still returned (for future graceful-shutdown wiring). Added a mirror comment at the call site.
- **Verification**: 130/130 api tests green, 53/53 shared tests green, typecheck clean, lint at 196 warnings (= cap), format clean.

## 2. `docs(deps): document why root overrides use flat syntax for svix`

- **Status**: ✅ **CLOSED** by PR #15 (2026-05-02)
- **Source**: verify report Warning 2 / Deviation 2
- **What was done**: Created a new `SECURITY.md` (66 lines) at the repo root. Documents (a) vuln reporting via private GitHub Security Advisory, (b) the CI `npm audit` policy (current gate at `--audit-level=high`), and (c) a table explaining why each entry in the root `package.json` `overrides` uses its specific form (flat `svix`, nested `xcode > uuid`, range-scoped `postcss@<8.5.10`), plus the workflow for adding a new override (lockfile regen + `npm ls` verification + the "expected `invalid`" note).
- **Why SECURITY.md**: GitHub auto-discovers it and surfaces it on the Security tab; CONTRIBUTING.md doesn't exist yet; `package.json` doesn't accept comments.
- **Cross-refs**: links back to `.sdd/discoveries/npm-overrides-workspaces.md` and PR #12.

## 3. `chore(deps): bump Expo SDK 55 → 56 and tighten audit gate to moderate`

- **Status**: 🟡 **DEFERRED** — escalated to issue #16 (2026-05-02). Requires SDD cycle (touches `.sdd/active-specs/cicd.md`).
- **Source**: verify report Suggestion 1 + design Decision 5 (post-sprint1-audit-hardening)
- **What**: After Expo SDK 56 lands, most accepted-risk moderate advisories in Expo internals are expected to clear. Once `npm audit` returns 0 moderates as well as 0 highs at root, tighten `.github/workflows/ci.yml` audit step from `--audit-level=high` to `--audit-level=moderate`.
- **Severity**: SUGGESTION (nice-to-have)
- **Effort**: medium — Expo bump can be invasive
- **Next step**: when ready, run `/sdd-explore expo-sdk-56-and-audit-moderate-gate`.

## 4. `feat(mobile): replace react-native-markdown-display to clear markdown-it ReDoS`

- **Status**: 🟡 **DEFERRED** — escalated to issue #17 (2026-05-02).
- **Source**: verify report Suggestion 2
- **What**: One of the 2 remaining accepted-risk moderates at HEAD `354957b` is the markdown-it ReDoS pulled in by `react-native-markdown-display`. Replace with an actively maintained alternative (e.g., `react-native-marked` or `react-native-render-html` + md→html preprocessor).
- **Severity**: SUGGESTION (nice-to-have, not exploitable in current trusted-content path)
- **Effort**: medium — UI library swap, regression-test markdown rendering on mobile
- **Schedule**: pair with issue #16 so both audit-clearing changes land near each other and the gate can tighten in one PR.

---

## Status summary as of 2026-05-02

| #   | Title                      | Status      | Closed by |
| --- | -------------------------- | ----------- | --------- |
| 1   | cron `start()` cleanup     | ✅ closed   | PR #14    |
| 2   | overrides syntax docs      | ✅ closed   | PR #15    |
| 3   | Expo SDK 56 + tighten gate | 🟡 deferred | issue #16 |
| 4   | replace markdown-it lib    | 🟡 deferred | issue #17 |

This file can be archived to `.sdd/archive/post-sprint1-audit-hardening/80-followups-resolution.md` once issues #16 and #17 are resolved (or moved to a dedicated change folder when they enter SDD).

## User-driven (not in this list because it's operational, not a code change)

- **Manual smoke test of push notifications** (PR #11). Requires: real device, `EXPO_PUBLIC_PROJECT_ID` set, Expo dev client. Walks through the 6-step list in PR #11's "Manual smoke" section. Still pending user execution.
