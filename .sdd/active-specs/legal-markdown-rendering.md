# Capability Spec: legal-markdown-rendering

> **topic_key**: `spec/legal-markdown-rendering`
> **type**: `architecture`
> **status**: `active`
> **last synced**: 2026-05-02 from `pending merge of feat/replace-react-native-markdown-display`

## Purpose

Render bundled, trusted legal markdown (Terms of Service, Privacy Policy) inside the mobile app with the existing dark-theme tokens, with zero native modules and zero `markdown-it` advisories.

The full behavioral spec for the legal screens themselves (route, navigation, error copy, retry behavior) lives in earlier change artifacts and the consumer file `apps/mobile/src/screens/LegalScreen.tsx`. This entry tracks **rendering invariants** that future changes MUST not break.

This spec was promoted from the change `replace-react-native-markdown-display` (issue #17). It supersedes the implicit "whatever `react-native-markdown-display` does" contract that existed before that change.

---

## Capability Invariants

### Requirement: Supported markdown feature allowlist is a HARD invariant

The renderer MUST support exactly these features, and no more:

| Feature         | Markdown syntax | Style key                  |
| --------------- | --------------- | -------------------------- |
| Heading 1       | `# text`        | `heading1`                 |
| Heading 2       | `## text`       | `heading2`                 |
| Heading 3       | `### text`      | `heading3`                 |
| Paragraph       | plain text      | `paragraph`                |
| Bold            | `**text**`      | `strong`                   |
| Unordered list  | `- item`        | `bullet_list`, `list_item` |
| Inline code     | `` `code` ``    | `code_inline`              |
| Blockquote      | `> text`        | `blockquote`               |
| Horizontal rule | `---`           | `hr`                       |

Extending this allowlist (e.g., adding tables, images, italic, ordered lists, external links, footnotes, task lists, nested lists, multi-line code blocks, embedded HTML, heading anchors, H4-H6) requires its OWN SDD change. It MUST NOT be done as a drive-by edit.

#### Scenario: Allowlisted feature renders with its style key

- GIVEN markdown that uses one of the 9 allowlisted features above
- WHEN the markdown is rendered through `MarkdownRenderer`
- THEN the corresponding style key from `MarkdownStyleDict` is applied
- AND the rendered output matches the documented dark-theme token (e.g., `C.t1`, `C.primary`, `C.surface`, `C.border`)

#### Scenario: Adding a new feature requires a new SDD change

- GIVEN a future PR that introduces support for a markdown feature outside the allowlist
- WHEN the PR is reviewed
- THEN reviewers MUST require an SDD change that explicitly amends this spec to add the feature to the allowlist
- AND the change MUST update both `tokensToNodes` (transform layer) and `MarkdownRenderer` (presentation layer) and add tests in `packages/shared`

---

### Requirement: Frontmatter is defensively stripped in the transform layer

The transform layer (`packages/shared/src/markdown/stripFrontmatter.ts`) MUST strip a leading YAML frontmatter block matching `^---\r?\n[\s\S]*?\r?\n---\r?\n?` BEFORE the markdown reaches `marked.lexer`. This is a belt-and-suspenders pattern: the API SHOULD strip frontmatter on its side, but the renderer MUST NOT trust the API contract on this point.

#### Scenario: API forgets to strip frontmatter

- GIVEN the legal endpoint regresses and returns markdown including a leading `---\ntitle: ...\n---\n` block
- WHEN the markdown is rendered
- THEN the frontmatter is stripped client-side
- AND only the document body renders (no `---` line, no YAML keys visible to the user)

#### Scenario: Mid-document horizontal rule preserved

- GIVEN markdown with `---` appearing AFTER body content (i.e., as a horizontal rule, not as frontmatter)
- WHEN the markdown is rendered
- THEN the mid-document `---` renders as a `hr` block
- AND only a leading frontmatter block (anchored to string start) is stripped

---

### Requirement: Unknown markdown nodes degrade to plain text

If `marked` emits a token type the renderer does not handle, the renderer MUST:

1. Render the token's `raw`/`text` content as a plain text node — NEVER crash, NEVER show a blank screen
2. In `__DEV__` (`process.env['NODE_ENV'] !== 'production'`), emit `console.warn('[MarkdownRenderer] unsupported token: <type>')`
3. In production, render silently (no warning)

#### Scenario: Out-of-allowlist feature appears in markdown

- GIVEN markdown contains an out-of-allowlist feature (e.g., `[link](https://x)`, `| table |`, `![img](url)`, `*italic*`)
- WHEN the markdown is rendered in production
- THEN the user sees the raw text of the token (URL discarded for links; alt text shown for images)
- AND no error is thrown, no warning surfaces in production

#### Scenario: Out-of-allowlist feature in development

- GIVEN the same markdown in `__DEV__` mode
- WHEN the renderer encounters the unknown token
- THEN `console.warn` is called with the substring of the unhandled token type
- AND the failing token still degrades to plain text in the rendered output

---

### Requirement: Visual fidelity preserved through `MarkdownStyleDict`

The renderer MUST consume styles from a `MarkdownStyleDict` interface keyed by feature name. The dark-theme tokens currently bound in `LegalScreen.tsx`'s `mdStyles` (`C.bg`, `C.t1`, `C.w`, `C.primary`, `C.surface`, `C.border`) MUST flow through this dictionary with no visible regression on either ToS or Privacy.

`MarkdownStyleDict` MUST expose AT LEAST these keys (every key the renderer actually emits a style for):

- `body`, `heading1`, `heading2`, `heading3`, `paragraph`
- `strong`, `bullet_list`, `list_item`
- `blockquote`, `code_inline`, `hr`

`MarkdownStyleDict` MUST NOT expose keys for features outside the allowlist (e.g., `em`, `ordered_list`, `link`). The TypeScript excess-property check is the enforcement mechanism — `const mdStyles: MarkdownStyleDict = { ... }` will fail to compile if a consumer adds an out-of-allowlist key.

#### Scenario: Consumer cannot quietly bind an out-of-allowlist style

- GIVEN a consumer typed as `MarkdownStyleDict`
- WHEN the consumer attempts to add an out-of-allowlist style key (e.g., `em: { ... }`)
- THEN `tsc` reports a TypeScript excess-property error
- AND the change cannot land without an SDD-amended allowlist

#### Scenario: ToS and Privacy match pre-swap appearance

- GIVEN the ToS or Privacy markdown document
- WHEN rendered in `LegalScreen` after swapping to `MarkdownRenderer`
- THEN headings, paragraphs, blockquote backgrounds, bullet bullets, inline code styling, and `hr` lines match the pre-swap appearance verified manually on iOS sim, Android emulator, or web fallback

---

### Requirement: Pure JS only — no native modules

The renderer MUST NOT add ANY native module to the app. Specifically:

- NO `react-native-svg`, `react-native-render-html`, `react-native-marked`, `react-native-markdown-display`, or any package that requires `react-native link` or autolinking
- The runtime markdown dependency at the workspace root MUST be `marked` and only `marked`
- `marked` MUST be a pure-JS package with zero runtime advisories at install time

#### Scenario: Sole markdown dep is `marked`

- GIVEN the workspace at HEAD
- WHEN inspecting `apps/mobile/package.json` dependencies
- THEN `marked` is the sole markdown-related runtime dependency
- AND `react-native-markdown-display`, `react-native-marked`, `react-native-svg` (for markdown purposes), and `markdown-it` are absent
- AND `npm ls markdown-it` from the repo root reports empty

#### Scenario: Zero markdown-it advisories

- GIVEN the workspace at HEAD
- WHEN running `npm audit` at the repo root
- THEN zero `markdown-it`-chain advisories of any severity are reported

---

### Requirement: Pure transform lives in `packages/shared` with TDD coverage

The pure `tokensToNodes` transform (Marked AST → renderer-spec nodes) MUST live in `packages/shared/src/markdown/` with full Vitest coverage following strict TDD discipline (RED commit before GREEN, evidence in git log).

Behavioral coverage MUST include:

- ≥1 test for EACH of the 9 supported feature types (heading 1, heading 2, heading 3, paragraph, strong, list, list_item, codespan, blockquote, hr) — currently 9 in `tokensToNodes.test.ts`
- ≥3 frontmatter integration tests (with, without, mid-document `---`)
- ≥1 unknown-token degradation test (currently the link path stands in for the union)
- ≥1 empty-input test
- ≥1 non-ASCII / emoji preservation test (covering `⚠️`, `ñ`, accented vowels)

**Floor: ≥14 new tests in `packages/shared` for `tokensToNodes`.**

The `stripFrontmatter` helper MUST have ≥5 dedicated unit tests (with frontmatter, without, mid-document `---`, empty string, CRLF line endings).

#### Scenario: TDD evidence in git log

- GIVEN the implementation branch for any future change to the transform
- WHEN inspecting `git log --oneline` for `packages/shared/src/markdown/`
- THEN RED test commits MUST precede GREEN implementation commits
- AND RED commits MUST fail with a clear signal (module-not-found, expected assertion failure, etc.)

#### Scenario: Vitest coverage stays at floor or above

- GIVEN the `packages/shared` test suite
- WHEN running `npm run test:shared`
- THEN at least 14 tokensToNodes tests + 5 stripFrontmatter tests are green
- AND total `packages/shared` test count is ≥72 (53 prior baseline + 19 markdown floor)

---

## Implementation pointers

| Layer        | Path                                                                                                              | Responsibility                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Parse        | `node_modules/marked@^18`                                                                                         | string → `marked.Tokens.Token[]` AST. Zero deps, zero advisories. Pinned `^18.0.3`.                  |
| Transform    | `packages/shared/src/markdown/tokensToNodes.ts`                                                                   | Pure `Token[] → RenderNode[]`. Calls `stripFrontmatter` before lex. Dev-warn on unknown tokens.      |
| Transform    | `packages/shared/src/markdown/stripFrontmatter.ts`                                                                | Regex-anchored leading frontmatter strip. CRLF-tolerant.                                             |
| Types        | `packages/shared/src/markdown/types.ts`                                                                           | `RenderNode`, `InlineNode`, `ListItemNode` discriminated unions. `level: 1\|2\|3`, `ordered: false`. |
| Barrel       | `packages/shared/src/markdown/index.ts` + `packages/shared/src/index.ts` (`export * from './markdown';`)          | Public API for consumers.                                                                            |
| Tests        | `packages/shared/src/markdown/__tests__/{tokensToNodes,stripFrontmatter}.test.ts`                                 | Vitest. Floor: ≥14 + ≥5.                                                                             |
| Presentation | `apps/mobile/src/components/MarkdownRenderer.tsx`                                                                 | Thin RN layer. Maps `RenderNode[]` → `<View>`/`<Text>` per `MarkdownStyleDict`. No memoization.      |
| Consumer     | `apps/mobile/src/screens/LegalScreen.tsx`                                                                         | Owns `mdStyles: MarkdownStyleDict` (visual tokens). Hosts the only call to `<MarkdownRenderer />`.   |

---

## Out of Scope (explicitly excluded — adding any of these requires its own SDD change)

This spec MUST NOT be expanded by drive-by edits to support:

- Images (`![alt](url)`)
- Tables (`| col | col |`)
- Ordered lists (`1. item`)
- Italic (`*text*` / `_text_`)
- External links via `Linking.openURL` (link tokens currently degrade to plain text per requirement above)
- Multi-line / fenced code blocks (` ```lang ... ``` `)
- Nested lists
- Footnotes (`[^1]`)
- Task lists (`- [ ] item`)
- Heading anchors / in-page navigation
- Embedded HTML inside markdown
- Headings H4-H6

This spec MUST also NOT be amended to:

- Change the legal-screen route or navigation surface
- Change the `legalApi` client surface or backend endpoints
- Alter Spanish UI strings in `LegalScreen.tsx`
- Re-introduce `react-native-markdown-display`, `markdown-it`, or any `markdown-it`-chain dependency
- Add CI-workflow changes (audit gate tightening to `moderate` is tracked as issue #16, a separate SDD change)

---

## Glossary

| Term                 | Definition                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| renderer-spec node   | Abstract `RenderNode`/`InlineNode` emitted by `tokensToNodes`; maps 1:1 to a React Native component in the presentation layer |
| graceful degradation | Rendering unknown / unsupported tokens as plain text rather than crashing or showing blank content                            |
| frontmatter          | YAML metadata block at the start of a markdown file, delimited by `---` lines                                                 |
| allowlist            | The closed set of markdown features this renderer supports; expanding it requires an SDD change to this spec                  |

---

## Change history

- `pending merge of feat/replace-react-native-markdown-display` (PR #TBD-orchestrator-fill, expected 2026-05-02) — initial creation. Captures the rendering contract introduced when replacing `react-native-markdown-display` with `marked@^18` + a custom RN renderer to clear the last 2 `markdown-it` ReDoS moderates from `npm audit`. Sources: change `replace-react-native-markdown-display` archive at `.sdd/archive/replace-react-native-markdown-display/`.
