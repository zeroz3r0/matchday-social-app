# Apply Progress: replace-react-native-markdown-display

> **topic_key**: `sdd/replace-react-native-markdown-display/apply-progress`
> **type**: `architecture`
> **status**: `complete`
> **started**: 2026-05-02
> **completed**: 2026-05-02

Per-commit gate results, SHAs, deviations from `50-tasks.md`. Updated AFTER each commit.

## Baseline (pre-C1)

- `npm run test:shared`: 53/53
- `npm run test:api`: 130/130
- `npm run typecheck`: clean (3 workspaces)
- `npm audit --audit-level=moderate`: 2 moderate (markdown-it via react-native-markdown-display), 0 high, 0 critical
- Branch: `feat/replace-react-native-markdown-display` at `01e846b` (clean tree, untracked `.sdd/changes/` only)

---

## Commits

| #   | Subject                                                               | SHA       | Status    |
| --- | --------------------------------------------------------------------- | --------- | --------- |
| C1  | chore(deps): add marked@^18 to apps/mobile                            | `3141315` | green     |
| C2  | test(shared): add failing tests for stripFrontmatter (RED)            | `f1571e1` | RED ✓     |
| C3  | feat(shared): implement stripFrontmatter (GREEN)                      | `3b03313` | green     |
| C4  | test(shared): add failing tests for tokensToNodes (RED)               | `0d76c6d` | RED ✓     |
| C5  | feat(shared): implement tokensToNodes pure transform (GREEN)          | `75c2b17` | green     |
| C6  | feat(shared): export markdown module from package barrel              | `caa6395` | green     |
| C7  | feat(mobile): add MarkdownRenderer component                          | `a0ade31` | green     |
| C8  | feat(mobile): swap LegalScreen to MarkdownRenderer + cleanup mdStyles | `9422cbf` | green     |
| C9  | chore(deps): remove react-native-markdown-display                     | `43c79b6` | green     |
| SDD | docs(sdd): add replace-react-native-markdown-display change artifacts | _pending_ | _pending_ |

---

## Gate summary at HEAD (`43c79b6`)

| Gate                               | Result                                   |
| ---------------------------------- | ---------------------------------------- |
| `npm run shared:build`             | clean                                    |
| `npm run test:shared`              | 73/73 (53 baseline + 5 strip + 15 t2n)   |
| `npm run test:api`                 | 130/130                                  |
| `npm run typecheck`                | clean (3 workspaces)                     |
| `npm run lint`                     | 0 errors, 196 warnings (at cap, ≤196)    |
| `npm run format:check`             | clean                                    |
| `npm audit --audit-level=high`     | 0 vulnerabilities                        |
| `npm audit --audit-level=moderate` | 0 vulnerabilities (down from 2 moderate) |

---

## Deviations Log

| #   | Commit | Deviation                                                                                                                             | Reason                                                                                                                                                                                                                                                                                                                 |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | C5     | Created `packages/shared/src/markdown/index.ts` (sub-barrel) inside C5 alongside `types.ts` and `tokensToNodes.ts`, instead of in C6. | Design §11 D11 prescribes a separate commit for the **package-level** barrel only. The markdown sub-barrel is part of the module itself — committing it together with the module's two source files is cleaner. C6 still does its job: edits `packages/shared/src/index.ts` to expose the module to consumers.         |
| D2  | C7     | Folded prettier `--write` fixes for `tokensToNodes.ts` and `tokensToNodes.test.ts` (introduced in C5 and C4) into the C7 commit.      | C2-C6 are not lint-gated per the per-commit gate matrix in `50-tasks.md`. C7 is the first lint-gated commit, so the format-only delta lands here. Amending earlier commits would require rebase, which AGENTS rules restrict.                                                                                          |
| D3  | C8     | Dropped the `link` key from `mdStyles` instead of keeping it (task 8.8).                                                              | `MarkdownStyleDict` (per design §4) does not include `link`. Keeping it would produce a TypeScript excess-property error. Design §15 explicitly notes "If preferred for cleanliness, drop it now" — taking that path. A future Linking-enabled change can re-introduce both the dict field and the style key together. |

---

## Token type names verification (per design §14 open question 1)

Inspected `node_modules/marked/lib/marked.d.ts` after C1 install. All 18 token type names match the design §5 mapping table verbatim:

`heading`, `paragraph`, `strong`, `em`, `codespan`, `code`, `blockquote`, `list`, `list_item`, `hr`, `link`, `image`, `table`, `html`, `br`, `text`, `space`, `def`.

**No mapping deviations needed.**

---

## Detailed gate results per commit

### C1 — `3141315` chore(deps): add marked@^18 to apps/mobile

- shared:build: clean
- test:shared: 53/53
- test:api: 130/130
- typecheck: clean (3 workspaces)
- audit: 2 moderate (markdown-it via react-native-markdown-display) — UNCHANGED from baseline. marked@18.0.3 introduced zero new vulns.
- marked smoke: `node -e "const m = require('marked'); console.log(typeof m.lexer)"` → `function`
- marked types: all 18 token type names match design §5 verbatim (see verification section above)

### C2 — `f1571e1` test(shared): add failing tests for stripFrontmatter (RED)

- 5 test cases added (with frontmatter, without, mid-document `---`, empty, CRLF)
- `npm run test:shared` failed with `Cannot find module '../stripFrontmatter'` — RED signal as expected
- RED commit body: "RED commit: implementation in next commit. Expected to fail with module-not-found on ../stripFrontmatter."

### C3 — `3b03313` feat(shared): implement stripFrontmatter (GREEN)

- shared:build: clean
- test:shared: 58/58 (53 baseline + 5 stripFrontmatter)
- test:api: 130/130
- typecheck: clean
- Implementation: 1 regex `/^---\r?\n[\s\S]*?\r?\n---\r?\n?/` per design §6 (anchored, non-greedy, CRLF-tolerant)

### C4 — `0d76c6d` test(shared): add failing tests for tokensToNodes (RED)

- 15 test cases added (9 block features + 3 frontmatter integrations + 3 edge cases incl. unknown-token + empty + non-ASCII)
- `console.warn` stubbed with `vi.spyOn(console, 'warn').mockImplementation(() => {})` per skill prompt guidance; restored in `afterEach` via `mockRestore()`
- `npm run test:shared` failed with `Cannot find module '../tokensToNodes'` — RED signal
- RED commit body line acknowledges expected failure

### C5 — `75c2b17` feat(shared): implement tokensToNodes pure transform (GREEN)

- shared:build: clean
- test:shared: 73/73 (53 baseline + 5 stripFrontmatter + 15 tokensToNodes)
- test:api: 130/130
- typecheck: clean
- Implementation: discriminated-union types, block-token switch, inline recursion, `warnUnknown` helper guarded by `process.env['NODE_ENV'] !== 'production'` per design §7
- Files: `types.ts`, `tokensToNodes.ts`, `markdown/index.ts` (sub-barrel — see D1 deviation)

### C6 — `caa6395` feat(shared): export markdown module from package barrel

- shared:build: clean
- test:shared: 73/73
- test:api: 130/130
- typecheck: clean across 3 workspaces (verifies the export resolves from apps/mobile and apps/api typecheck contexts)
- 1-line addition to `packages/shared/src/index.ts`: `export * from './markdown';`

### C7 — `a0ade31` feat(mobile): add MarkdownRenderer component

- typecheck: clean
- lint: 0 errors, 196 warnings (at cap)
- format:check: clean
- New file: `apps/mobile/src/components/MarkdownRenderer.tsx` (~150 lines)
- Function component, no hooks (mobile convention). Imports `parseMarkdown` and types from `@matchday/shared`. Uses `captureException` from `lib/sentry` in catch path. Dev-logs guarded by `__DEV__`.
- Block layout: top-level `<View>` with siblings (paragraphs/headings as `<Text>`, blockquote as `<View>` wrapping `<Text>`, list as `<View>` with `<Text>` per item, hr as `<View>`). Avoids the invalid `<View>` inside `<Text>` nesting.
- Body style composed via `[styles.body, styles.<override>]` to ensure default color/lineHeight reach every block.
- Folded prettier --write fixes for C4/C5 files into this commit (see D2 deviation)

### C8 — `9422cbf` feat(mobile): swap LegalScreen to MarkdownRenderer + cleanup mdStyles

- typecheck: clean
- lint: 0 errors, 196 warnings (at cap, not regressed)
- format:check: clean
- Import swap: `react-native-markdown-display` → `../components/MarkdownRenderer` (named import + type)
- JSX swap: `<Markdown style={mdStyles}>{content ?? ''}</Markdown>` → `<MarkdownRenderer source={content ?? ''} styles={mdStyles} />`
- `mdStyles` typed as `MarkdownStyleDict`
- Dropped `em` and `ordered_list` keys per design §15 addendum
- Dropped `link` key (see D3 deviation)
- Kept `heading3` per addendum
- All Spanish UI strings unchanged (TITLES, "Cerrar", "No pudimos cargar el documento. Intentá de nuevo.")
- No new useCallback/useMemo/forwardRef
- No new `any`

### C9 — `43c79b6` chore(deps): remove react-native-markdown-display

- shared:build: clean
- test:shared: 73/73
- test:api: 130/130
- typecheck: clean (3 workspaces)
- lint: 0 errors, 196 warnings (at cap)
- format:check: clean
- audit --audit-level=high: 0 vulnerabilities
- audit --audit-level=moderate: **0 vulnerabilities** (down from 2 baseline — spec acceptance criterion met)
- `npm ls react-native-markdown-display`: (empty)
- `npm ls markdown-it`: (empty)
- Lockfile fully regenerated (`rm package-lock.json && npm install`) per `.sdd/discoveries/npm-overrides-workspaces.md`
- 13 packages removed, 0 added

---

## Risks for verify

- Test 13 (link inline degradation) asserts the `console.warn` call contains the substring `link`. The actual warn message is `[MarkdownRenderer] unsupported token: link`. Substring match (`expect(warnedWith).toContain('link')`) is robust against future message tweaks.
- Test 4.16 (non-ASCII) uses `⚠️` (U+26A0 + variation selector U+FE0F), `ñ`, and accented vowels in the source string and asserts verbatim equality on the resulting `text.value`. Vitest passes — assumes Node's UTF-8 string handling is byte-faithful, which it is. Real-device RN render of `⚠️` should also be faithful but is a manual smoke item (V.2.c in tasks).
- The C7 component nests blocks as siblings under `<View>`, not as children of a `<Text style={styles.body}>` wrapper. This means `body` color/lineHeight is composed per-block via `[styles.body, styles.<key>]`. Verify can confirm the resulting visual matches pre-swap by manual inspection on device (V.2 / V.3).
- The `link` key is no longer in `mdStyles` — if any future `LegalScreen` markdown test/snapshot referenced it, it would need updating. There are no mobile tests today, so no current test impact.
- Lint stays at exactly 196 warnings (at cap). Verify should re-run `npm run lint` to confirm and flag any drift.

---

## Final state

- Branch: `feat/replace-react-native-markdown-display`
- HEAD before SDD-docs commit: `43c79b6`
- 9 implementation commits + 1 SDD-docs commit (added next, NOT yet pushed)
- Ready for `sdd-verify`
