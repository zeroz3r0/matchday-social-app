# Explore: replace-react-native-markdown-display

> **topic_key**: `sdd/replace-react-native-markdown-display/explore`
> **type**: `discovery`
> **status**: `active` (working folder, will move to `.sdd/archive/` after archive phase)
> **last synced**: 2026-05-02 — explore phase via sdd-explore sub-agent

**Source issue**: GitHub #17 — `feat(mobile): replace react-native-markdown-display to clear markdown-it ReDoS`
**Source follow-up**: `.sdd/follow-ups/post-sprint1-audit.md` item #4 (deferred from PR #12 verify)

---

## Executive summary

Recommend **Path B: `marked@18.0.3` + tiny custom RN renderer (~150–200 lines)** to replace `react-native-markdown-display`. `marked` ships zero deps and zero advisories, requires no native rebuild, and the legal docs use only 7 markdown features — a hand-rolled renderer is small, fully controllable, and preserves dark-theme tokens 1:1. The alternative `react-native-marked` would solve audit but adds 7 transitive deps + a `react-native-svg` peer (~3.7 MB) that triggers a native rebuild for one screen — bad ROI. Biggest risk: the custom renderer becomes a maintenance burden if the legal docs grow new feature usage (mitigated by an explicit feature-allowlist + warning log on unknown nodes).

---

## Decision log — comparison

| Dimension                                 | A. `react-native-marked@8.0.1`                                                                   | **B. `marked@18.0.3` + custom renderer** ✅                                                                                | C. `react-native-render-html@6.3.4`                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Last published**                        | 2026-03-17 (~6 weeks) — fresh                                                                    | recent — actively maintained                                                                                               | 2022-06-26 (~4 years) — stale                                        |
| **License**                               | MIT                                                                                              | MIT                                                                                                                        | BSD-2-Clause                                                         |
| **Direct deps added**                     | 8 (marked + 7 others)                                                                            | **1** (marked, zero-dep)                                                                                                   | 9 (incl. ramda, urijs — heavy)                                       |
| **Native peer deps NOT installed**        | `react-native-svg ≥ 12.3.0` (native rebuild + ~3.7 MB unpacked)                                  | **none**                                                                                                                   | none claimed but old                                                 |
| **Native rebuild required**               | YES                                                                                              | **NO**                                                                                                                     | NO                                                                   |
| **Unpacked size**                         | 262 KB + ~449 KB marked + 3.7 MB svg ≈ **4.4 MB**                                                | **449 KB** (marked only)                                                                                                   | ~1 MB + transitives                                                  |
| **`npm audit` at install**                | clean (verified)                                                                                 | **clean** (zero deps, zero advisories)                                                                                     | unknown — old transitives risky                                      |
| **Visual fidelity vs `mdStyles`**         | Indirect: must learn the lib's renderer-prop API and map our 14 style keys to its node renderers | **Direct: we own the `<Text>`/`<View>` mapping; current `mdStyles` becomes a plain style dict**                            | Requires md→html preprocessor; HTML node API is verbose for our case |
| **Migration effort in `LegalScreen.tsx`** | ~30–50 LoC change (swap import, map renderers prop)                                              | **~150–200 LoC NET** (replace `<Markdown>` with custom `<MarkdownRenderer>` component, ~7 token cases + frontmatter strip) | ~80–120 LoC + preprocessor wiring                                    |
| **Long-term flexibility (tables/images)** | Strong — full feature set OOTB                                                                   | Weaker — must extend renderer per feature; but legal docs are stable, scope-controlled by us                               | Strong but stale lib = risk                                          |
| **Tech debt / risk profile**              | Medium: one more 3rd-party RN component to track + native dep coupling                           | **Low: pure JS, fully owned UI layer, easy to test in isolation later**                                                    | High: 4-year-old lib, may not survive RN 0.83 / React 19             |

---

## Why Path B wins for THIS project

1. **The legal docs use only 7 markdown features** (H1/H2/H3, **bold**, `> blockquote`, `-` lists, `` `inline code` ``, `---` hr, paragraphs). A custom renderer mapping 7 cases is ~150 lines of boring TS — well within senior-dev maintenance comfort.
2. **No native rebuild.** This is a **mobile** monorepo with EAS/Expo prebuild concerns. Adding `react-native-svg` to clear ONE screen's markdown is a horrible cost/benefit. Path B touches only JS.
3. **Audit story is bulletproof.** `marked` has 0 deps and 0 advisories. Removing `react-native-markdown-display` deletes 4 deps including the offending `markdown-it@^10`. After this change, the 2 remaining moderate vulns disappear → unblocks issue #16 (tighten gate to `moderate`).
4. **Convention alignment.** Project bans `useCallback`/`useMemo` in new mobile code (React 19 + Compiler) — a custom renderer that's just plain function components fits this convention naturally. A 3rd-party lib forces us to live with whatever it does internally.
5. **Visual fidelity.** The current `mdStyles` object (14 style keys for 7 features) becomes a **direct** style dictionary the renderer reads — there's no impedance mismatch with a 3rd-party renderer-prop API.
6. **Spanish UI strings constraint** — irrelevant for the renderer itself but the custom path lets us add user-facing fallbacks (e.g., "Contenido no soportado") in voseo without library negotiation.
7. **Testability.** The pure AST→nodes transform can live in `packages/shared` (Vitest) — strict TDD applies. Mobile renderer becomes a thin presentation layer.
8. **Scope clarity.** Each future markdown feature added = explicit SDD change with a written justification. Prevents organic scope creep.

---

## Open questions (resolved by orchestrator before propose)

| #   | Question                                                            | Resolution                                                                                                                                                                      |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | External links — handle via `Linking.openURL`?                      | **No.** Legal docs verified to contain zero `[text](url)` links. Renderer treats `link` token as plain text + `console.warn` in dev. Future change can add `Linking` if needed. |
| 2   | Frontmatter handling — strip where?                                 | **Defensive strip in renderer** (regex `^---\n[\s\S]*?\n---\n`) regardless of API contract. Belt + suspenders: if API ever forgets, UI does not regress.                        |
| 3   | Unknown markdown nodes policy                                       | **`console.warn` in dev + plain text fallback in prod.** Combines explore's options 2c + 2b.                                                                                    |
| 4   | Renderer file location                                              | **`apps/mobile/src/components/MarkdownRenderer.tsx`** — separate component, matches repo convention (other components live in `components/`).                                   |
| 5   | Heading IDs / anchors                                               | **Skip entirely.** No in-page nav in legal screens.                                                                                                                             |
| 6   | Pure transform in `packages/shared` for Vitest?                     | **YES.** `tokensToNodes` (AST → renderer-spec) goes to `packages/shared/src/markdown/`. Strict TDD applies. RN-specific `<Text>`/`<View>` mapping stays in mobile.              |
| 7   | Lazy-import `marked` to keep bundle small until Legal screen opens? | **No, overkill.** ~80 KB minified for a Settings-reachable screen is acceptable. Future change only if measured to hurt.                                                        |

---

## Risks (must be addressed in design / apply / verify)

- **R1 — Style token drift**: the 14 keys in `mdStyles` (LegalScreen.tsx:135–179) must map 1:1 to the new renderer's element handlers. Mitigation: design phase produces an explicit mapping table; verify phase does a side-by-side screenshot diff (or at minimum a reviewer sign-off on both ToS + Privacy screens).
- **R2 — `marked` AST shape stability**: `marked` v18 is a major; we'd be coupling to its `Tokens.*` interface. Mitigation: pin to `^18` in `package.json`, write an internal `Token → RNNode` adapter in ONE file so future major bumps are isolated.
- **R3 — Frontmatter not stripped**: if the API ever forgets to strip YAML frontmatter, raw `---\n title: ...\n---` would render as a horizontal rule + paragraph. Mitigation: defensive strip in renderer regardless of API contract (belt + suspenders).
- **R4 — Bundle size regression elsewhere**: adding `marked` (449 KB unpacked, ~80 KB minified) to the mobile bundle when the user might never visit Legal screens. **Resolved**: accepted (see open question 7).
- **R5 — Inline emoji in blockquote**: `> ⚠️ blockquote` — the ⚠️ is part of the text node. Custom renderer must not strip emoji or break on non-ASCII. Trivial in RN (`<Text>` handles it natively) but worth a verify check.
- **R6 — Lint/format baseline**: 0 errors, 196 warnings cap. New renderer file must not push warning count over cap. Mitigation: apply phase runs lint before commit.
- **R7 — Removing the old dep cleanly**: `react-native-markdown-display` may leave Metro cache artifacts. Mitigation: apply phase notes `npx expo start -c` (clear cache) in the manual verify steps.
- **R8 — Custom renderer future scope creep**: someone later adds a Help/About screen with markdown and tries to add tables to the renderer ad-hoc. Mitigation: design phase declares the renderer's supported feature set explicitly; future expansion = its own SDD change.

---

## Pre-resolved facts (do not re-verify in subsequent phases)

### Sole consumer

`apps/mobile/src/screens/LegalScreen.tsx:18` — `import Markdown from 'react-native-markdown-display';`. Renders bundled markdown fetched from `/api/legal/tos` or `/api/legal/privacy`. Applies `mdStyles` object (LegalScreen.tsx:135–179) keyed by element name (`body`, `heading1`, `heading2`, `heading3`, `paragraph`, `link`, `strong`, `em`, `bullet_list`, `ordered_list`, `list_item`, `blockquote`, `code_inline`, `hr`).

### Markdown features actually used in the legal docs

Audited `apps/api/src/legal/tos-v1.md` and `apps/api/src/legal/privacy-v1.md`. Features in use:

- `#` H1 (1 each), `##` H2 (7 each)
- `**bold**`
- `> ⚠️ blockquote` (single-line, with emoji)
- `-` unordered list bullets
- `` `inline code` `` (one occurrence: `` `/users/me/export` ``)
- YAML frontmatter at top (`--- ... ---`) — stripped defensively in renderer
- `---` horizontal rule

**NOT used**: images, tables, external links visible to user, multi-line code blocks, HTML, SVG, ordered lists, italic, nested lists, footnotes, task lists.

### Audit baseline confirmed via `npm audit --json` (orchestrator, 2026-05-02)

```
moderate: 2  (both same chain: markdown-it < 12.3.2 ← react-native-markdown-display)
high:     0
critical: 0
total:    2
fixAvailable: false
```

Removing the offending lib + parent eliminates BOTH advisories.

---

## Next phase

`sdd-propose` — scope hint: a **single-PR** mobile-focused change that
(1) adds `marked@^18` to `apps/mobile`,
(2) creates `packages/shared/src/markdown/tokensToNodes.ts` (pure AST→spec, Vitest TDD),
(3) creates `apps/mobile/src/components/MarkdownRenderer.tsx` (RN presentation layer over the spec),
(4) swaps the import + JSX in `apps/mobile/src/screens/LegalScreen.tsx`,
(5) removes `react-native-markdown-display` from `apps/mobile/package.json` and refreshes lockfile,
(6) verifies `npm audit` shows 0 moderates at root.

Out of scope: tightening the CI audit gate to `moderate` (issue #16, separate change blocked-by this); supporting tables/images/links beyond what current legal docs use; bumping Expo SDK 56 (not stable yet).
