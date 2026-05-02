# Follow-ups from PR #12 (post-Sprint-1 audit hardening)

> **topic_key**: `matchday-social-app/follow-ups/post-sprint1-audit`
> **type**: `discovery`
> **status**: 3 of 4 closed; remaining 1 deferred
> **last synced**: 2026-05-02 from archive of `replace-react-native-markdown-display`

**Source change**: `post-sprint1-audit-hardening` (PR #12, merge commit `354957b`)
**Identified by**: verify phase (`.sdd/archive/post-sprint1-audit-hardening/70-verify-report.md`)

---

## 1. `refactor(api): remove redundant cron start() calls and fix misleading v4 auto-start comment`

- **Source**: verify report Warning 1 / Deviation 1
- **What**: `apps/api/src/jobs/scheduler.ts:86-87` calls `legalJobs.hardDelete.start()` and `legalJobs.exportSweep.start()` after `cron.schedule()`. Under node-cron v4 these are no-ops (auto-starts on schedule). Also, the comment at `apps/api/src/jobs/legalCronJobs.ts:91-92` saying "node-cron@4 tasks do not auto-start" is **factually wrong** and should be replaced with: "v4 auto-starts on cron.schedule(); explicit .start() here is defensive/idempotent" — or the calls should be removed entirely.
- **Severity**: WARNING (not blocking)
- **Effort**: trivial (3-5 line change + 1 comment fix)

## 2. `docs(deps): document why root overrides use flat syntax for svix`

- **Source**: verify report Warning 2 / Deviation 2
- **What**: Root `package.json` overrides block uses flat syntax for `svix`, range-scoped for `postcss`, nested only for `xcode > uuid`. Reason (npm 11 silently ignored nested overrides for workspace-child deps during apply) is in the PR body but should also live in the repo (e.g., a comment in `package.json` near the overrides block, or a section in `CONTRIBUTING.md` / `SECURITY.md`).
- **Severity**: WARNING (documentation hygiene)
- **Effort**: small (one comment block or short doc section)

## 3. `chore(deps): bump Expo SDK 55 → 56 and tighten audit gate to moderate`

- **Source**: verify report Suggestion 1 + design Decision 5 (post-sprint1-audit-hardening)
- **What**: After Expo SDK 56 lands, most accepted-risk moderate advisories in Expo internals are expected to clear. Once `npm audit` returns 0 moderates as well as 0 highs at root, tighten `.github/workflows/ci.yml` audit step from `--audit-level=high` to `--audit-level=moderate`. This requires an SDD proposal because the audit gate spec (`.sdd/active-specs/cicd.md`) explicitly says "Moderate-and-below do not block" — that scenario must be revised.
- **Severity**: SUGGESTION (nice-to-have)
- **Effort**: medium — Expo bump can be invasive
- **Update (2026-05-02)**: Audit-gate tightening to `moderate` is now READY — the `replace-react-native-markdown-display` change cleared the last 2 moderates from the root tree (2 → 0). Issue #16 can be SPLIT: tightening the gate is a small standalone change (no SDK bump required) and should be done first; the Expo SDK 56 bump becomes its own separate effort once SDK 56 stabilizes.

## 4. `feat(mobile): replace react-native-markdown-display to clear markdown-it ReDoS`

- **Source**: verify report Suggestion 2
- **What**: One of the 2 remaining accepted-risk moderates at HEAD `354957b` is the markdown-it ReDoS pulled in by `react-native-markdown-display`. Replace with an actively maintained alternative (e.g., a different markdown renderer entirely) to clear the advisory.
- **Severity**: SUGGESTION (nice-to-have, not exploitable in current trusted-content path)
- **Effort**: medium — UI library swap, regression-test markdown rendering on mobile
- **Status**: ✅ **CLOSED** by PR #TBD-orchestrator-fill (2026-05-02). Escalated to issue #17 then resolved via dedicated SDD change `replace-react-native-markdown-display` (see `.sdd/archive/replace-react-native-markdown-display/00-archive-report.md`). Result: 2 root moderates → 0; new capability spec at `.sdd/active-specs/legal-markdown-rendering.md`.

---

## How to triage next session

1. Open each as a GitHub issue with the title above and the description distilled from this entry.
2. Optionally turn #3 and #4 into formal SDD proposals (they touch behavior); #1 and #2 can stay as plain refactor/docs PRs.
3. After issues are filed, update this file with the issue numbers.

## User-driven (not in this list because it's operational, not a code change)

- **Manual smoke test of push notifications** (PR #11). Requires: real device, `EXPO_PUBLIC_PROJECT_ID` set, Expo dev client. Walks through the 6-step list in PR #11's "Manual smoke" section.
