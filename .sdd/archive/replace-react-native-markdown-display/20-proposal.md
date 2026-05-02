# Proposal: replace-react-native-markdown-display

> **topic_key**: `sdd/replace-react-native-markdown-display/proposal`
> **type**: `decision`
> **status**: `active`
> **last synced**: 2026-05-02

**Source issue**: GitHub #17 — `feat(mobile): replace react-native-markdown-display to clear markdown-it ReDoS`
**Unblocks**: #16 (audit gate tighten high → moderate). Out of scope here.
**Sibling open work (no conflict)**: #14, #15, #18.
**Predecessor artifact**: see `10-explore.md` for full candidate comparison and decision rationale.

---

## 1. Intent

`react-native-markdown-display` is the sole consumer of `markdown-it@^10`, which carries 2 unfixable moderate ReDoS advisories surfaced by `npm audit`. Today this forces our CI audit gate to stay at `--audit-level=high` (see `.sdd/follow-ups/post-sprint1-audit.md` item #3), masking any future moderate-severity supply-chain regression. Success means: zero moderate advisories at the workspace root, the gate can be tightened in a follow-up change (#16), and the legal screens render with the same dark-theme fidelity they have today — no visual regression.

---

## 2. Scope

### In scope (single mobile-focused PR)

| Path                                                           | Action                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/mobile/package.json`                                     | Add `marked@^18`; remove `react-native-markdown-display`.                                                                                                                                                                                                                                              |
| `package-lock.json` (root)                                     | Refresh after add/remove.                                                                                                                                                                                                                                                                              |
| `packages/shared/src/markdown/tokensToNodes.ts`                | NEW — pure `Token[] → RenderNode[]` transform. Vitest TDD (RED → GREEN).                                                                                                                                                                                                                               |
| `packages/shared/src/markdown/index.ts`                        | NEW — local barrel re-exporting `tokensToNodes` + node types.                                                                                                                                                                                                                                          |
| `packages/shared/src/markdown/__tests__/tokensToNodes.test.ts` | NEW — covers all 7 supported features + frontmatter strip + unknown-node fallback.                                                                                                                                                                                                                     |
| `packages/shared/src/index.ts`                                 | Add `export * from './markdown';` — confirmed this file IS a barrel (5 existing `export *` lines).                                                                                                                                                                                                     |
| `apps/mobile/src/components/MarkdownRenderer.tsx`              | NEW — RN presentation layer that consumes the spec from `@matchday/shared`. Hosts the style dict (former `mdStyles`).                                                                                                                                                                                  |
| `apps/mobile/src/screens/LegalScreen.tsx`                      | Swap `import Markdown from 'react-native-markdown-display'` → `import { MarkdownRenderer } from '../components/MarkdownRenderer'`. Replace `<Markdown style={mdStyles}>{content}</Markdown>` with `<MarkdownRenderer source={content} />`. Drop the inline `mdStyles` block (LegalScreen.tsx:135–179). |

### Out of scope (explicit, to prevent creep)

- CI audit-gate tightening to `moderate` — that is issue #16, gated on this PR's merge.
- Markdown features the legal docs do not currently use: tables, images, external links (rendered as plain text + dev `console.warn`), ordered lists, italic, nested lists, multi-line code blocks, HTML, footnotes, task lists.
- Backend legal endpoints (`/api/legal/tos`, `/api/legal/privacy`) — untouched.
- Backend markdown source files (`apps/api/src/legal/tos-v1.md`, `apps/api/src/legal/privacy-v1.md`) — untouched.
- Expo SDK 56 upgrade (canary-only).
- Promoting `MarkdownRenderer` to a shared component for hypothetical Help/About screens.

---

## 3. Approach (high-level — TDD ordering belongs in tasks)

1. `npm install marked@^18 -w apps/mobile`.
2. Author `tokensToNodes` in `packages/shared/src/markdown/` strict-TDD: failing Vitest first, then implementation, per supported feature (heading levels, paragraph, strong, blockquote, list, list_item, code_inline, hr, frontmatter strip, unknown-node fallback).
3. Wire `packages/shared/src/index.ts` barrel; rebuild shared.
4. Author `MarkdownRenderer.tsx` in `apps/mobile/src/components/` — thin RN layer over the spec; hosts the style dict migrated 1:1 from `mdStyles`.
5. Swap import + JSX in `LegalScreen.tsx`; delete the inline `mdStyles` block.
6. `npm uninstall react-native-markdown-display -w apps/mobile`.
7. `rm package-lock.json && npm install` (npm-11 + workspaces nested-overrides gotcha — see `.sdd/discoveries/npm-overrides-workspaces.md`).
8. Run all gates: `npm run test:shared` (target 53 + new), `npm run test:api` (130/130), `npm run typecheck`, `npm run lint` (≤196 warnings), `npm run format:check`, `npm audit --audit-level=moderate` (must exit 0).

---

## 4. Decisions locked-in (from explore § "Open questions")

| #   | Question                | Locked decision                                                                                                         |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | External links          | Render as plain text. Dev-only `console.warn`. No `Linking.openURL`.                                                    |
| 2   | Frontmatter             | Defensive strip in renderer via regex `^---\n[\s\S]*?\n---\n` regardless of API contract (belt + suspenders).           |
| 3   | Unknown markdown nodes  | Dev `console.warn` + plain-text fallback in prod.                                                                       |
| 4   | Renderer file location  | `apps/mobile/src/components/MarkdownRenderer.tsx`.                                                                      |
| 5   | Heading IDs / anchors   | Skip — no in-page nav in legal screens.                                                                                 |
| 6   | Pure transform location | `packages/shared/src/markdown/tokensToNodes.ts` with Vitest TDD. RN-specific `<Text>`/`<View>` mapping stays in mobile. |
| 7   | Lazy-load `marked`      | No. ~80 KB minified for a Settings-reachable screen is acceptable.                                                      |

---

## 5. Risks carried forward (from explore § "Risks")

| ID  | Risk                                                                   | Owning phase                      | Mitigation                                                                                                   |
| --- | ---------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| R1  | Style token drift — 14 keys in `mdStyles` must map 1:1 to new renderer | design + verify                   | Design produces explicit token→element mapping table; verify does manual ToS+Privacy sign-off on dark theme. |
| R2  | `marked` v18 `Tokens.*` AST shape coupling                             | design                            | Pin to `^18` in `package.json`; isolate AST adapter in a single file (`tokensToNodes.ts`).                   |
| R3  | Frontmatter not stripped by API → renders as `<hr>` + paragraph        | design + apply                    | Design specifies regex; apply implements it inside renderer.                                                 |
| R4  | Bundle size regression (~80 KB minified)                               | resolved (accepted in explore Q7) | None — no action.                                                                                            |
| R5  | Inline emoji in blockquote (`> ⚠️ ...`)                                | verify                            | Manual smoke check on both ToS and Privacy.                                                                  |
| R6  | Lint baseline cap (196 warnings)                                       | apply                             | Run `npm run lint` per commit; fail commit if cap exceeded.                                                  |
| R7  | Metro cache holds stale resolution of removed dep                      | apply                             | PR body includes `npx expo start -c` instruction for reviewers running locally.                              |
| R8  | Future scope creep — someone adds tables ad-hoc                        | spec                              | Spec declares the supported-feature allowlist explicitly; expansion = new SDD change.                        |

---

## 6. Acceptance criteria (testable, derived from issue #17)

- [ ] `npm audit --audit-level=moderate` exits 0 at workspace root (zero `markdown-it` chain advisories).
- [ ] `npm run test:shared` passes — at least 53 baseline + new `tokensToNodes` tests, all green.
- [ ] `npm run test:api` passes — 130/130 (no API touched, must not regress).
- [ ] `npm run typecheck` clean across all 3 workspaces.
- [ ] `npm run format:check` clean.
- [ ] `npm run lint` ≤ 196 warnings, 0 errors.
- [ ] No new `useCallback` / `useMemo` / `forwardRef` introduced in `MarkdownRenderer.tsx` or `LegalScreen.tsx` (mobile convention).
- [ ] No new `any` introduced in production paths.
- [ ] All Spanish UI strings preserved (no copy changes in `LegalScreen.tsx`).
- [ ] `react-native-markdown-display` removed from `apps/mobile/package.json` AND absent from `package-lock.json`.
- [ ] Manual smoke (verify phase, dev only — no automated visual diff): ToS and Privacy render with the same dark-theme fidelity as before the change. Headings, bold, blockquote (with ⚠️ emoji), bullet list, inline code (`/users/me/export`), and `<hr>` all visually correct.

---

## 7. Rollback plan

The change ships as a single squash-merge PR. Revert is straightforward:

```
git revert <merge-sha>
rm -rf apps/mobile/node_modules
rm package-lock.json
npm install
```

This restores `react-native-markdown-display` and the original `LegalScreen.tsx` (with inline `mdStyles`). The `packages/shared/src/markdown/` module becomes orphaned (no remaining importers) but inert — safe to leave in place and remove via a follow-up `chore:` PR, or delete in the same revert if reviewer prefers a cleaner working tree.

No DB migrations, no feature flags, no environment changes — pure code revert.

---

## 8. Phase ownership

| Phase         | Deliverable                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdd-spec`    | `30-spec.md` — behavioral invariants for legal markdown rendering, supported-feature allowlist, frontmatter contract, unknown-node fallback policy. |
| `sdd-design`  | `40-design.md` — token→node mapping table, `tokensToNodes` file structure, error-handling strategy, AST-adapter isolation, rollback specifics.      |
| `sdd-tasks`   | `50-tasks.md` — hierarchical checklist with strict TDD ordering for `packages/shared` (RED commit before GREEN).                                    |
| `sdd-apply`   | `60-apply-progress.md` — per-commit RED→GREEN log, gate results per commit, lint warning count tracking.                                            |
| `sdd-verify`  | `70-verify-report.md` — gate-by-gate results + manual smoke notes for ToS and Privacy on dark theme.                                                |
| `sdd-archive` | `00-archive-report.md` — synthesis, spec-sync notes, follow-up to close issue #16's blocker.                                                        |

`sdd-spec` and `sdd-design` can run in parallel — both depend only on this proposal and the explore. `sdd-tasks` depends on both.
