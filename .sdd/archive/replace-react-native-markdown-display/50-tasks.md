> **topic_key**: `sdd/replace-react-native-markdown-display/tasks`
> **type**: `decision`
> **status**: `active`
> **last synced**: 2026-05-02

# Tasks: replace-react-native-markdown-display

Hierarchical task checklist organized by commit boundary. Each top-level group (`C1`...`C9`) is ONE commit on the implementation branch. Strict TDD applies to `packages/shared` work: RED test commit precedes GREEN implementation commit (per `.sdd/project-context.md`). Mobile-only commits have no TDD requirement.

Per-commit gate (subset chosen per commit scope, see `40-design.md` and `30-spec.md`):

- `npm run shared:build` — clean
- `npm run test:shared` — 53 baseline → ≥72 after C5
- `npm run test:api` — 130/130 unchanged
- `npm run typecheck` — clean across 3 workspaces
- `npm run lint` — 0 errors, ≤196 warnings
- `npm run format:check` — clean
- `npm audit --audit-level=high` (CI baseline) and `--audit-level=moderate` (post-C9)

Cross-refs: spec = `30-spec.md`, design = `40-design.md` (incl. §15 addendum).

---

## C1 — `chore(deps): add marked@^18 to apps/mobile`

Pure dependency addition. No behavioral change. Sets foundation for transform/renderer.

- [ ] 1.1 Add `"marked": "^18.0.3"` to `apps/mobile/package.json` dependencies block (alphabetical position)
- [ ] 1.2 Run `npm install` from repo root (npm workspaces hoists shared deps)
- [ ] 1.3 Verify `node_modules/marked/package.json` exists and version satisfies `^18.0.3`
- [ ] 1.4 Verify `package-lock.json` updated with `marked` entry
- [ ] 1.5 Smoke import: `node -e "const m = require('marked'); console.log(typeof m.lexer)"` → prints `function`
- [ ] 1.6 Confirm `marked` types resolve: open `node_modules/marked/lib/marked.d.ts`, verify `Token` union exists per design §14.1
- [ ] 1.7 Run `npm audit --audit-level=moderate` → 2 existing moderates remain (markdown-it chain), no NEW vulns introduced by marked
- [ ] 1.8 Per-commit gate: `npm run shared:build`, `npm run test:shared` (53), `npm run test:api` (130), `npm run typecheck` (3 workspaces) — all green
- [ ] 1.9 `git add apps/mobile/package.json package-lock.json && git commit -m "chore(deps): add marked@^18 to apps/mobile"`

---

## C2 — `test(shared): add failing tests for stripFrontmatter` (RED)

RED commit. The implementation file does NOT exist yet — module-not-found is the expected failure signal. Per project-context, RED MUST precede GREEN with git evidence.

- [ ] 2.1 Create directory `packages/shared/src/markdown/__tests__/`
- [ ] 2.2 Create `packages/shared/src/markdown/__tests__/stripFrontmatter.test.ts` with imports from `../stripFrontmatter` (file does not exist yet)
- [ ] 2.3 Test case 1: markdown WITH leading frontmatter (`---\ntitle: ToS\n---\n# Body`) → returns `# Body` (per spec §Frontmatter / scenario 1)
- [ ] 2.4 Test case 2: markdown WITHOUT frontmatter → returned unchanged (no-op, scenario 2)
- [ ] 2.5 Test case 3: markdown with mid-document `---` only → preserved verbatim (scenario 3)
- [ ] 2.6 Test case 4: empty string → returns empty string
- [ ] 2.7 Test case 5: CRLF line endings (`---\r\n...\r\n---\r\n`) → stripped correctly per design §6 regex
- [ ] 2.8 Verify locally that `npm run test:shared` FAILS with module-not-found / cannot find `../stripFrontmatter` — that is the RED signal
- [ ] 2.9 `git add packages/shared/src/markdown/__tests__/stripFrontmatter.test.ts && git commit -m "test(shared): add failing tests for stripFrontmatter"` with body line `RED commit: implementation in next commit. Expected to fail.`

---

## C3 — `feat(shared): implement stripFrontmatter` (GREEN)

Make C2 RED tests pass. Pure regex helper per design §6.

- [ ] 3.1 Create `packages/shared/src/markdown/stripFrontmatter.ts` exporting `stripFrontmatter(source: string): string`
- [ ] 3.2 Implement using regex `/^---\r?\n[\s\S]*?\r?\n---\r?\n?/` per design §6 (anchored, non-greedy, CRLF-tolerant)
- [ ] 3.3 Run `npm run test:shared` → all 5 stripFrontmatter cases pass; baseline 53 + 5 = 58 tests green
- [ ] 3.4 Per-commit gate: `npm run shared:build`, `npm run test:shared` (58), `npm run test:api` (130), `npm run typecheck`
- [ ] 3.5 `git add packages/shared/src/markdown/stripFrontmatter.ts && git commit -m "feat(shared): implement stripFrontmatter"`

---

## C4 — `test(shared): add failing tests for tokensToNodes` (RED)

RED commit for the pure transform. Tests import from `../tokensToNodes` (file does not exist yet) and `../types` (does not exist yet). Coverage targets ≥14 new tests per spec §"Pure transform testable in isolation".

- [ ] 4.1 Create `packages/shared/src/markdown/__tests__/tokensToNodes.test.ts` with imports from `marked`, `../tokensToNodes`, `../types`
- [ ] 4.2 Feature test 1 — `# H1` produces `RenderNode { type: 'heading', level: 1 }` per design §5
- [ ] 4.3 Feature test 2 — `## H2` produces `RenderNode { type: 'heading', level: 2 }`
- [ ] 4.4 Feature test 3 — `### H3` produces `RenderNode { type: 'heading', level: 3 }`
- [ ] 4.5 Feature test 4 — plain `paragraph` produces `RenderNode { type: 'paragraph' }` with `text` inline child
- [ ] 4.6 Feature test 5 — `**bold**` inside paragraph produces nested `InlineNode { type: 'strong' }` with `text` child
- [ ] 4.7 Feature test 6 — `- item1\n- item2` produces `RenderNode { type: 'list', ordered: false, items: [...] }` with 2 ListItemNode entries
- [ ] 4.8 Feature test 7 — `` `inline code` `` produces `InlineNode { type: 'codespan', value }`
- [ ] 4.9 Feature test 8 — `> quote text` produces `RenderNode { type: 'blockquote' }` with inline children
- [ ] 4.10 Feature test 9 — `---` (alone, mid-document) produces `RenderNode { type: 'hr' }`
- [ ] 4.11 Frontmatter integration test 10 — `parseMarkdown('---\ntitle: x\n---\n# Body')` strips frontmatter then transforms (heading-only output)
- [ ] 4.12 Frontmatter integration test 11 — `parseMarkdown('# NoFrontmatter')` works unchanged
- [ ] 4.13 Frontmatter integration test 12 — `parseMarkdown` with mid-document `---` after body content yields `hr` node, not stripped
- [ ] 4.14 Unknown-token test 13 — input `[link](https://x)` produces `InlineNode { type: 'text', value: 'link' }` (URL discarded per design §5 / D6); stub `console.warn` and assert it is called in dev with `link` substring
- [ ] 4.15 Empty input test 14 — `parseMarkdown('')` returns `[]` (no crash per design §9)
- [ ] 4.16 Non-ASCII test 15 — markdown with `⚠️ ñáéíóú` in paragraph produces matching `text` value verbatim per spec §"Non-ASCII content preserved"
- [ ] 4.17 Verify `npm run test:shared` FAILS with module-not-found on `../tokensToNodes` and `../types` — RED signal
- [ ] 4.18 `git add packages/shared/src/markdown/__tests__/tokensToNodes.test.ts && git commit -m "test(shared): add failing tests for tokensToNodes"` with body `RED commit: implementation in next commit. Expected to fail.`

---

## C5 — `feat(shared): implement tokensToNodes pure transform` (GREEN)

GREEN commit. Implements types + transform + module barrel. All 14 tests from C4 plus the 5 from C3 pass.

- [ ] 5.1 Create `packages/shared/src/markdown/types.ts` with `RenderNode`, `InlineNode`, `ListItemNode` discriminated unions per design §2 (level constrained to `1 | 2 | 3`, `ordered: false` literal)
- [ ] 5.2 Create `packages/shared/src/markdown/tokensToNodes.ts` exporting `tokensToNodes(tokens: Token[]): RenderNode[]` and `parseMarkdown(source: string): RenderNode[]`
- [ ] 5.3 Implement block-token switch per design §5 mapping table (heading 1-3, paragraph, blockquote, list ordered=false, hr, br, space)
- [ ] 5.4 Implement inline-token recursion (text, strong, codespan, link→text+warn)
- [ ] 5.5 Implement `warnUnknown(tokenType)` helper guarded by `process.env['NODE_ENV'] !== 'production'` per design §7
- [ ] 5.6 Implement `parseMarkdown` as `tokensToNodes(marked.lexer(stripFrontmatter(source)))`
- [ ] 5.7 Headings depth 4-6 → emit `RenderNode { type: 'unknown', tokenType: 'heading' }` per design §5 mapping
- [ ] 5.8 Ordered list (`ordered=true`) → emit `unknown` per mapping
- [ ] 5.9 `em`, `code` (fenced), `image`, `table`, `html` → emit `unknown` per mapping
- [ ] 5.10 Create `packages/shared/src/markdown/index.ts` barrel exporting `tokensToNodes`, `parseMarkdown`, `stripFrontmatter`, and types per design §4 public API
- [ ] 5.11 Run `npm run test:shared` — 53 baseline + 5 (stripFrontmatter) + ≥14 (tokensToNodes) = ≥72 tests, all green
- [ ] 5.12 Per-commit gate full: shared:build, test:shared (≥72), test:api (130), typecheck
- [ ] 5.13 `git add packages/shared/src/markdown/{types.ts,tokensToNodes.ts,index.ts} && git commit -m "feat(shared): implement tokensToNodes pure transform"`

---

## C6 — `feat(shared): export markdown module from package barrel`

Separate small commit per design §12 / D11 to enable selective revert if downstream issues surface.

- [ ] 6.1 Edit `packages/shared/src/index.ts` — add `export * from './markdown';` at the end (or alphabetical with existing 5 `export *` lines)
- [ ] 6.2 Run `npm run shared:build` to verify barrel compiles cleanly and dist exposes the new module
- [ ] 6.3 Per-commit gate: shared:build, test:shared (≥72), test:api (130), typecheck (3 workspaces — verifies the export resolves from `apps/mobile` and `apps/api` typecheck contexts)
- [ ] 6.4 `git add packages/shared/src/index.ts && git commit -m "feat(shared): export markdown module from package barrel"`

---

## C7 — `feat(mobile): add MarkdownRenderer component (presentation layer)`

Mobile-only commit. No TDD per project-context (mobile has no test runner). Component is a pure consumer of the C5 transform.

- [ ] 7.1 Create `apps/mobile/src/components/MarkdownRenderer.tsx`
- [ ] 7.2 Export `MarkdownStyleDict` interface per design §4 — keys: `body`, `heading1`, `heading2`, `heading3`, `paragraph`, `strong`, `bullet_list`, `list_item`, `blockquote`, `code_inline`, `hr` (note: `em` and `ordered_list` deliberately absent per design §15 addendum; `link` retained per addendum forward-compat)
- [ ] 7.3 Export `MarkdownRendererProps { source: string; styles: MarkdownStyleDict }` per design §4
- [ ] 7.4 Export `MarkdownRenderer(props): React.JSX.Element` as a plain function component — NO `useCallback`, NO `useMemo`, NO `forwardRef` (mobile convention from project-context.md)
- [ ] 7.5 Import `parseMarkdown`, `RenderNode`, `InlineNode`, `ListItemNode` from `@matchday/shared`
- [ ] 7.6 Implement render: call `parseMarkdown(source)` then map block nodes to `<View>`/`<Text>` per design §8
- [ ] 7.7 Block: `heading` → `<Text style={styles[`heading${level}`]}>` with inline children
- [ ] 7.8 Block: `paragraph` → `<Text style={styles.paragraph}>` with inline children
- [ ] 7.9 Block: `blockquote` → `<View style={styles.blockquote}><Text>{children}</Text></View>` per design §8
- [ ] 7.10 Block: `list` → `<View style={styles.bullet_list}>` containing one `<Text style={styles.list_item}>• {item-children}</Text>` per item
- [ ] 7.11 Block: `hr` → `<View style={styles.hr} />`
- [ ] 7.12 Block: `unknown` → `<Text style={styles.paragraph}>{raw}</Text>` (graceful degradation per spec)
- [ ] 7.13 Inline: `text` → string; `strong` → `<Text style={styles.strong}>`; `codespan` → `<Text style={styles.code_inline}>{value}</Text>`
- [ ] 7.14 Wrap `parseMarkdown` call in try/catch per design §9: on error, render plain `source` as `<Text>` and log via `console.error` in dev
- [ ] 7.15 Check whether `apps/mobile/src/lib/sentry.ts` exists and exports `captureException` (design §9 + §14.2). If yes, import and call in catch path. If no, skip Sentry — log only.
- [ ] 7.16 Per-commit gate: `npm run typecheck` (mobile + 3 workspaces clean), `npm run lint` (0 errors, warnings ≤196), `npm run format:check` clean
- [ ] 7.17 `git add apps/mobile/src/components/MarkdownRenderer.tsx && git commit -m "feat(mobile): add MarkdownRenderer component"`

---

## C8 — `feat(mobile): swap LegalScreen to MarkdownRenderer + cleanup mdStyles`

Migrate the sole consumer. Per design §10 and §15 addendum.

- [ ] 8.1 Open `apps/mobile/src/screens/LegalScreen.tsx`
- [ ] 8.2 Replace `import Markdown from 'react-native-markdown-display';` with `import { MarkdownRenderer, type MarkdownStyleDict } from '../components/MarkdownRenderer';`
- [ ] 8.3 Replace `<Markdown style={mdStyles}>{content ?? ''}</Markdown>` with `<MarkdownRenderer source={content ?? ''} styles={mdStyles} />`
- [ ] 8.4 Type the existing `mdStyles` declaration as `const mdStyles: MarkdownStyleDict = { ... }` per design §10
- [ ] 8.5 DROP the `em` key from `mdStyles` (dead code per design §15 addendum — italic out of allowlist)
- [ ] 8.6 DROP the `ordered_list` key from `mdStyles` (dead code per addendum — ordered lists out of allowlist)
- [ ] 8.7 KEEP `heading3` key (defensive, allowed by spec) per design §15 addendum
- [ ] 8.8 KEEP `link` key per design §15 recommendation; add a one-line code comment noting it is currently inert (renderer emits link as plain text per D6)
- [ ] 8.9 Verify Spanish UI strings in `LegalScreen.tsx` are unchanged (no copy edits — project-context constraint)
- [ ] 8.10 Verify no new `useCallback` / `useMemo` / `forwardRef` introduced (mobile convention)
- [ ] 8.11 Verify no new `any` introduced (project-context strict TS rule)
- [ ] 8.12 Per-commit gate: `npm run typecheck`, `npm run lint` (0 errors, ≤196 warnings — fail if regressed), `npm run format:check`
- [ ] 8.13 `git add apps/mobile/src/screens/LegalScreen.tsx && git commit -m "feat(mobile): swap LegalScreen to MarkdownRenderer + cleanup mdStyles"`

---

## C9 — `chore(deps): remove react-native-markdown-display`

Final cleanup. Lockfile regen mandated by `.sdd/discoveries/npm-overrides-workspaces.md` (npm 11 + workspaces nested-overrides gotcha).

- [ ] 9.1 Remove `"react-native-markdown-display": "^7.0.2"` line from `apps/mobile/package.json`
- [ ] 9.2 Delete `package-lock.json` at repo root
- [ ] 9.3 Run `npm install` from repo root to regenerate the lockfile cleanly
- [ ] 9.4 Verify `npm ls react-native-markdown-display` from repo root → reports "(empty)" or error (dep absent)
- [ ] 9.5 Verify `npm ls markdown-it` from repo root → no entry from `react-native-markdown-display` chain remains
- [ ] 9.6 Run `npm audit --audit-level=moderate` → exits 0 (zero `markdown-it` advisories per spec acceptance criterion)
- [ ] 9.7 Per-commit gate FULL: `npm run shared:build`, `npm run test:shared` (≥72), `npm run test:api` (130/130), `npm run typecheck` (3 workspaces), `npm run lint` (0 errors, ≤196 warnings), `npm run format:check`, `npm audit --audit-level=high` exits 0
- [ ] 9.8 `git add apps/mobile/package.json package-lock.json && git commit -m "chore(deps): remove react-native-markdown-display"`

---

## Tasks NOT in any commit (verify-phase / PR-prep work)

These run AFTER C9 lands locally but BEFORE the PR is opened (or as part of `sdd-verify`).

- [ ] V.1 Manual smoke: `cd apps/mobile && npx expo start -c` (clear Metro cache one-time after old lib removal — per `40-design.md` R7 mitigation and discoveries gotcha)
- [ ] V.2 Open ToS screen on iOS sim, Android emulator, or web fallback. Confirm:
  - [ ] V.2.a Headings (H1, H2) render with same sizes / colors as pre-swap
  - [ ] V.2.b Bold (`**Última actualización**`) renders bold per `strong` style
  - [ ] V.2.c Blockquote (`> ⚠️ ...`) renders with `C.surface` bg + `C.primary` left border, ⚠️ emoji intact (R5 verification)
  - [ ] V.2.d Bullet list items render with `•` prefix and `C.t1` color
  - [ ] V.2.e Inline code (`` `/users/me/export` ``) renders with `C.surface` bg + `C.primary` fg
  - [ ] V.2.f Hr lines render as 1px `C.border` lines
  - [ ] V.2.g No console errors visible in Metro / dev tools
- [ ] V.3 Open Privacy screen, repeat V.2.a–V.2.g checks
- [ ] V.4 PR body content: include before/after `npm audit` table, list of touched files, per-commit gate results matrix, and the `npx expo start -c` note for reviewers running locally

---

## RED → GREEN evidence summary (for verify phase)

| RED commit | GREEN commit | Workspace         | Behavior under test                              |
| ---------- | ------------ | ----------------- | ------------------------------------------------ |
| C2         | C3           | `packages/shared` | `stripFrontmatter` regex helper                  |
| C4         | C5           | `packages/shared` | `tokensToNodes` + `parseMarkdown` pure transform |

Mobile commits C7, C8 have no RED counterpart — mobile workspace has no test runner per project-context.md.

---

## Per-commit gate matrix (quick reference)

| Commit     | shared:build | test:shared     | test:api | typecheck | lint | format | audit                 |
| ---------- | ------------ | --------------- | -------- | --------- | ---- | ------ | --------------------- |
| C1         | ✓            | ✓ (53)          | ✓ (130)  | ✓         | —    | —      | —                     |
| C2 (RED)   | ✓            | ✗ expected fail | ✓        | —         | —    | —      | —                     |
| C3 (GREEN) | ✓            | ✓ (58)          | ✓        | ✓         | —    | —      | —                     |
| C4 (RED)   | ✓            | ✗ expected fail | ✓        | —         | —    | —      | —                     |
| C5 (GREEN) | ✓            | ✓ (≥72)         | ✓        | ✓         | —    | —      | —                     |
| C6         | ✓            | ✓ (≥72)         | ✓        | ✓         | —    | —      | —                     |
| C7         | ✓            | ✓               | ✓        | ✓         | ✓    | ✓      | —                     |
| C8         | ✓            | ✓               | ✓        | ✓         | ✓    | ✓      | —                     |
| C9         | ✓            | ✓ (≥72)         | ✓ (130)  | ✓         | ✓    | ✓      | ✓ (moderate, exits 0) |
