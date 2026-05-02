# Archive Report: replace-react-native-markdown-display

> **topic_key**: `sdd/replace-react-native-markdown-display/archive-report`
> **type**: `decision`
> **status**: `archived`
> **last synced**: 2026-05-02

**Change**: `replace-react-native-markdown-display`
**Mode**: `.sdd/`-only (no engram dependency for this archive)
**Status**: archived
**Branch**: `feat/replace-react-native-markdown-display` — branch HEAD at archive: `d7c78a3` (verify report) → archive commit lands on top
**PR**: #TBD-orchestrator-fill (orchestrator opens after archive commit pushes)
**Source issue**: #17 (closed by PR merge)
**Unblocks**: issue #16 (CI audit-gate tightening from `high` to `moderate`)

---

## Executive summary

Replaced `react-native-markdown-display` with `marked@^18` plus a custom three-layer mobile renderer (transform in `packages/shared`, presentation in `apps/mobile`). Cleared the last two `markdown-it` ReDoS moderates from `npm audit` (root: 2m → 0m), all 8 verify gates green (`shared:build`, 73/73 shared tests, 130/130 api tests, typecheck clean, lint 196/196 at cap, format clean, audit at high and at moderate both exit 0). Strict TDD evidence in git log (RED-before-GREEN for both `stripFrontmatter` and `tokensToNodes`). The change unblocks issue #16 (audit-gate tightening) and ships a new capability spec at `.sdd/active-specs/legal-markdown-rendering.md` that locks the rendering contract going forward.

## Change folder pointer

The 7 phase artifacts for this change have been MOVED via `git mv` from `.sdd/changes/replace-react-native-markdown-display/` to this archived folder (`.sdd/archive/replace-react-native-markdown-display/`). Git history preserves them as renames.

| Phase            | File                       |
| ---------------- | -------------------------- |
| explore          | `10-explore.md`            |
| proposal         | `20-proposal.md`           |
| spec (delta)     | `30-spec.md`               |
| design           | `40-design.md`             |
| tasks            | `50-tasks.md`              |
| apply-progress   | `60-apply-progress.md`     |
| verify-report    | `70-verify-report.md`      |
| archive-report   | `00-archive-report.md` (this) |

The working folder under `.sdd/changes/` no longer exists — it has been moved here. Anyone reading this archive in the future starts at `00-archive-report.md` and follows the cross-refs.

## Implementation summary

9 implementation commits + 1 SDD-docs commit on `feat/replace-react-native-markdown-display`:

| #   | SHA       | Subject                                                               |
| --- | --------- | --------------------------------------------------------------------- |
| C1  | `3141315` | chore(deps): add marked@^18 to apps/mobile                            |
| C2  | `f1571e1` | test(shared): add failing tests for stripFrontmatter (RED)            |
| C3  | `3b03313` | feat(shared): implement stripFrontmatter (GREEN)                      |
| C4  | `0d76c6d` | test(shared): add failing tests for tokensToNodes (RED)               |
| C5  | `75c2b17` | feat(shared): implement tokensToNodes pure transform (GREEN)          |
| C6  | `caa6395` | feat(shared): export markdown module from package barrel              |
| C7  | `a0ade31` | feat(mobile): add MarkdownRenderer component                          |
| C8  | `9422cbf` | feat(mobile): swap LegalScreen to MarkdownRenderer + cleanup mdStyles |
| C9  | `43c79b6` | chore(deps): remove react-native-markdown-display                     |
| SDD | `d7c78a3` | docs(sdd): add replace-react-native-markdown-display change artifacts |

Plus this archive commit (added by `sdd-archive`, SHA recorded after commit lands).

### Verify gate snapshot at HEAD `d7c78a3`

| Gate                               | Result                                                |
| ---------------------------------- | ----------------------------------------------------- |
| `npm run shared:build`             | clean                                                 |
| `npm run test:shared`              | 73/73 (53 baseline + 5 strip + 15 tokensToNodes)      |
| `npm run test:api`                 | 130/130                                               |
| `npm run typecheck`                | clean (3 workspaces)                                  |
| `npm run lint`                     | 0 errors, 196 warnings (= cap, no regression)         |
| `npm run format:check`             | clean                                                 |
| `npm audit --audit-level=high`     | exit 0 (0 vulnerabilities)                            |
| `npm audit --audit-level=moderate` | exit 0 (0 vulnerabilities, down from 2 baseline)      |

### Audit delta (root → root)

| Severity | Pre-change (`354957b` master) | Post-change (HEAD `d7c78a3`) | Delta |
| -------- | ----------------------------- | ---------------------------- | ----- |
| critical | 0                             | 0                            | 0     |
| high     | 0                             | 0                            | 0     |
| moderate | **2** (markdown-it chain)     | **0**                        | **–2** |
| low      | 0                             | 0                            | 0     |
| **total** | **2**                         | **0**                        | **–2** |

The two cleared moderates were both `markdown-it < 12.3.2` advisories pulled in transitively by `react-native-markdown-display`. Removing the parent dep eliminated both.

## Spec sync

A single new active-spec file was created (no existing capability spec to merge into):

| Capability                | Action  | Active-spec file                                      |
| ------------------------- | ------- | ----------------------------------------------------- |
| `legal-markdown-rendering` | CREATED | `.sdd/active-specs/legal-markdown-rendering.md`       |

The new spec is scoped to **rendering invariants** (allowlist, frontmatter strip, graceful degradation, visual fidelity, no native modules, TDD floor). It locks in the rendering contract introduced by this change so future drive-by edits to `tokensToNodes`, `MarkdownRenderer`, or `LegalScreen` cannot silently expand or weaken what the legal screens render.

The spec's `last synced` line currently reads `pending merge of feat/replace-react-native-markdown-display` and the `Change history` section references `PR #TBD-orchestrator-fill`. The orchestrator updates both placeholders to the actual merge SHA + PR number after the PR merges.

No existing active-specs (`auth.md`, `cron-scheduling.md`, `cicd.md`) were modified — this change is purely additive at the active-spec layer.

## Decisions locked into the codebase

From `40-design.md` Decisions Log + §15 addendum:

| #   | Decision                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `marked@^18.0.3` — pinned. Sole markdown runtime dep. Zero transitives, zero advisories.                                                |
| D2  | Pure transform lives in `packages/shared/src/markdown/` (Vitest). Mobile is presentation only.                                          |
| D3  | `MarkdownStyleDict` keys mirror the consumer's existing style keys 1:1 — zero-friction migration.                                       |
| D4  | Frontmatter stripped defensively in the transform layer (belt + suspenders against API contract drift).                                 |
| D5  | Unknown markdown nodes degrade to plain text + dev-only `console.warn`. Production: silent.                                             |
| D6  | Link tokens drop the URL and emit plain text. No `Linking.openURL` until a future SDD change re-adds it.                                |
| D7  | `RenderNode` / `InlineNode` are discriminated unions with `level: 1\|2\|3` literal and `ordered: false` literal — TS catches drift.    |
| D8  | No `useCallback` / `useMemo` / `forwardRef` in the new mobile components (project convention; React 19 + Compiler).                     |
| D9  | Dev-warn guard uses `process.env['NODE_ENV'] !== 'production'` (portable across `packages/shared` and Metro).                           |
| D10 | `mdStyles` stays in `LegalScreen.tsx` (consumer owns the visual tokens, not the renderer).                                              |
| D11 | The package-level barrel export ships in its own commit (C6 `caa6395`) so revert can be selective.                                      |
| §15 | `MarkdownStyleDict` does NOT expose `em`, `ordered_list`, or (per apply D3) `link` — TS excess-property check enforces the allowlist. |
| §15 | `heading3` is retained even though current legal docs do not use it (defensive, allowed by allowlist).                                  |

## Risks resolution

### From `40-design.md` §13

| ID | Risk                                                  | Resolution                                                                                                  |
| -- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| R1 | Style token drift                                     | RESOLVED — `MarkdownStyleDict` enforces 11 keys at compile time; `LegalScreen.tsx` typed accordingly.       |
| R2 | `marked` AST coupling                                 | RESOLVED — single adapter file `tokensToNodes.ts`; pinned `^18.0.3`.                                        |
| R3 | Frontmatter not stripped                              | RESOLVED — defensive strip in `parseMarkdown` + 5 unit tests for `stripFrontmatter`.                        |
| R4 | Bundle size regression (~80 KB minified)              | RESOLVED — accepted in explore Q7. No deferred action.                                                      |
| R5 | Inline emoji rendering (`⚠️`)                          | RESOLVED in tests (test 15 round-trips verbatim); DEFERRED-TO-MANUAL on device (V.2.c smoke).               |
| R6 | Lint cap (196 warnings)                               | RESOLVED — lint at exactly 196 warnings, no regression. Verified at every lint-gated commit and at HEAD.    |
| R7 | Metro cache holds stale resolution of removed dep      | DEFERRED-TO-MANUAL — PR body should call out `npx expo start -c` for reviewers running locally.             |
| R8 | Future scope creep (someone adds tables ad-hoc)       | RESOLVED — spec allowlist explicit; expansion = new SDD change. Enforced by `MarkdownStyleDict` excess check. |

### From `60-apply-progress.md` `risks_for_verify`

| Risk                                                                       | Resolution                                                                                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Test 13 substring assertion brittleness (`expect(warnedWith).toContain`)   | RESOLVED — substring match is robust against future warn-message tweaks; passes.                                      |
| Test 4.16 non-ASCII byte-faithful in tests                                 | RESOLVED in tests; DEFERRED-TO-MANUAL on device (V.2.c).                                                              |
| Block sibling layout under `<View>` (not nested in `<Text style={body}>`)  | DEFERRED-TO-MANUAL — visual parity needs eye check on iOS sim, Android emulator, or web fallback (V.2 / V.3).         |
| `link` style key removal could break a future snapshot                     | ACCEPTED — no mobile snapshots/tests today (mobile has no test runner); no current impact.                            |
| Lint cap drift                                                             | RESOLVED — re-run at HEAD confirms exactly 196 warnings.                                                              |

The deferred-to-manual items (R5 visual emoji, R7 Metro cache, V.1–V.4 manual smoke) are the irreducible portion that requires real devices. They fall to the PR reviewer.

## Follow-ups created

None new. The change closed cleanly. The only "follow-up" worth tracking is the placeholder-fill task for the orchestrator (PR number + merge SHA) once the PR merges — both in `.sdd/active-specs/legal-markdown-rendering.md` and in `.sdd/follow-ups/post-sprint1-audit.md`.

## Issues touched

- **Closes #17** on PR merge (the source issue: "feat(mobile): replace react-native-markdown-display to clear markdown-it ReDoS"). The PR body should include `Closes #17`.
- **Unblocks #16** (audit-gate tightening from `high` to `moderate`). With root moderate count now at 0, issue #16 can be split: tightening the `.github/workflows/ci.yml` audit step to `--audit-level=moderate` is now a small standalone change with no Expo SDK upgrade required. This was originally entangled with `chore(deps): bump Expo SDK 55 → 56` in follow-up #3, but the SDK bump is no longer a blocker for the gate change.

## Cross-machine sync state

All `.sdd/` artifacts for this change are committed on the branch:

- The 7 phase files were committed as part of the SDD-docs commit `d7c78a3` on the branch (apply phase tail).
- This archive commit (added by `sdd-archive`) commits:
  - The new `00-archive-report.md` (this file) under `.sdd/archive/replace-react-native-markdown-display/`
  - The 7 phase files moved via `git mv` from `.sdd/changes/` into this archive folder (git tracks as renames, history preserved)
  - The new `.sdd/active-specs/legal-markdown-rendering.md`
  - The updated `.sdd/follow-ups/post-sprint1-audit.md`

After this commit pushes and the PR merges, any teammate on a fresh machine pulling `main` will see the full archive trail under `.sdd/archive/replace-react-native-markdown-display/` and the new capability spec at `.sdd/active-specs/legal-markdown-rendering.md`. Engram is per-machine and deliberately bypassed for this archive — the `.sdd/` folder IS the source of truth.
