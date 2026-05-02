# Spec: replace-react-native-markdown-display

> **topic_key**: `sdd/replace-react-native-markdown-display/spec`
> **type**: `architecture`
> **status**: `active`
> **last synced**: 2026-05-02

## Purpose

This spec defines user-observable behavior for legal markdown rendering on mobile after replacing `react-native-markdown-display` with `marked` + a custom RN renderer. References GitHub issue #17 and proposal `20-proposal.md`.

---

## Capability Deltas

This change is **additive**. It does NOT modify:

- `.sdd/active-specs/auth.md`
- `.sdd/active-specs/cron-scheduling.md`
- `.sdd/active-specs/cicd.md`

Archive phase WILL produce a NEW capability spec: `.sdd/active-specs/legal-markdown-rendering.md`.

---

## Requirements

### Requirement: Supported markdown feature allowlist

The renderer MUST support exactly these markdown features (all observed in `apps/api/src/legal/tos-v1.md` and `apps/api/src/legal/privacy-v1.md`):

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

The renderer MUST NOT support: images, tables, external links, ordered lists, italic, multi-line code blocks (fenced), HTML embedded in markdown, footnotes, task lists, nested lists, heading anchors.

#### Scenario: All supported features render correctly

- GIVEN legal markdown containing all 7 feature types (headings, paragraph, bold, list, inline code, blockquote, hr)
- WHEN the markdown is rendered in `LegalScreen`
- THEN each feature renders with its documented dark theme token from the style dictionary

#### Scenario: Non-ASCII content preserved

- GIVEN markdown containing `⚠️`, `ñ`, accented vowels (`á`, `é`, `í`, `ó`, `ú`)
- WHEN the markdown is rendered
- THEN all characters render verbatim without mojibake or substitution

#### Scenario: Unsupported features degrade gracefully

- GIVEN markdown containing an unsupported feature (e.g., `| table |`, `![image](url)`, `[link](url)`)
- WHEN the markdown is rendered
- THEN the raw text content renders as a plain paragraph
- AND in `__DEV__` mode, a `console.warn` logs the unhandled token type
- AND in production, no warning is emitted

---

### Requirement: Frontmatter stripped before rendering

The renderer MUST defensively strip a leading YAML frontmatter block (matching pattern `^---\n[\s\S]*?\n---\n`) from the markdown source before parsing.

This guarantees the UI does NOT regress if the API ever stops stripping frontmatter (belt-and-suspenders pattern).

#### Scenario: Markdown with leading frontmatter

- GIVEN markdown with leading frontmatter (`---\ntitle: ToS\n---\n# Content`)
- WHEN the markdown is rendered
- THEN only the body renders (no `---` line, no YAML keys visible)

#### Scenario: Markdown without frontmatter

- GIVEN markdown with no frontmatter block
- WHEN the markdown is rendered
- THEN content renders unchanged (strip is a no-op)

#### Scenario: Mid-document horizontal rule preserved

- GIVEN markdown with `---` appearing mid-document (not at the start)
- WHEN the markdown is rendered
- THEN the mid-document `---` renders as a horizontal rule (only leading block is stripped)

---

### Requirement: Unknown token graceful degradation

If `marked` returns a token type the renderer does not handle, the renderer MUST:

1. Render the token's `raw` text as a plain paragraph (no crash, no blank screen)
2. In `__DEV__` mode, log `console.warn` containing the unhandled token type
3. In production, render silently with no warning

#### Scenario: Table token renders as plain text

- GIVEN markdown containing a table (`| col | col |`)
- WHEN the markdown is rendered
- THEN the table syntax renders as plain text
- AND in `__DEV__` mode, `console.warn` logs `"Unhandled token type: table"`

#### Scenario: Link token renders text only

- GIVEN markdown containing a link (`[text](https://example.com)`)
- WHEN the markdown is rendered
- THEN the link text renders as plain text (URL discarded, no `Linking.openURL`)
- AND in `__DEV__` mode, `console.warn` logs the unhandled token type

---

### Requirement: Visual fidelity preserved

The renderer MUST consume styles from a single style dictionary keyed by feature name. The dark theme tokens currently in `LegalScreen.tsx`'s `mdStyles` (lines 135–179) MUST be reusable through this dictionary with no visible regression.

Required style keys:

- `body`, `heading1`, `heading2`, `heading3`, `paragraph`
- `strong`, `bullet_list`, `list_item`
- `blockquote`, `code_inline`, `hr`

Theme tokens: `C.bg`, `C.t1`, `C.w`, `C.primary`, `C.surface`, `C.border`.

#### Scenario: ToS screen renders with identical styling

- GIVEN the ToS markdown document
- WHEN rendered in `LegalScreen` after the swap
- THEN headings, paragraphs, blockquote backgrounds, and all styling match pre-swap appearance

#### Scenario: Privacy screen renders with identical styling

- GIVEN the Privacy Policy markdown document
- WHEN rendered in `LegalScreen` after the swap
- THEN list bullets, inline code styling, and hr appearance match pre-swap appearance

#### Scenario: Inline code renders with correct tokens

- GIVEN markdown containing `` `/users/me/export` ``
- WHEN the markdown is rendered
- THEN inline code renders with `C.surface` background and `C.primary` foreground

---

### Requirement: Bundle and runtime constraints

The renderer MUST NOT add any native module to the app (no `react-native-svg`, no `react-native-render-html`, no packages requiring `react-native link` or autolinking).

The new dependency `marked` MUST be a pure-JS package with zero runtime advisories at install time.

#### Scenario: Only marked added as runtime dep

- GIVEN the change merges
- WHEN inspecting `apps/mobile/package.json`
- THEN `marked` is the sole markdown-related runtime dependency
- AND `react-native-markdown-display`, `react-native-marked`, `react-native-svg` are absent

#### Scenario: Zero markdown-it advisories

- GIVEN the change merges
- WHEN running `npm audit` at workspace root
- THEN zero `markdown-it` advisories of any severity are reported

---

### Requirement: Pure transform testable in isolation

The pure `tokensToNodes` transform (Marked AST → renderer-spec nodes) MUST live in `packages/shared` with full Vitest coverage following strict TDD discipline (RED commit before GREEN, evidence in git log).

Behavioral coverage MUST include:

- Each of the 7 supported feature types (≥7 tests)
- Frontmatter stripping with and without (≥3 tests)
- Unknown token graceful degradation (≥2 tests)
- Empty input (≥1 test)
- Non-ASCII / emoji preservation (≥1 test)

**Total: ≥14 new tests in `packages/shared`.**

#### Scenario: TDD evidence in commit history

- GIVEN the implementation branch
- WHEN inspecting git log for `packages/shared/src/markdown/`
- THEN RED test commits precede GREEN implementation commits

#### Scenario: Vitest coverage complete

- GIVEN the `tokensToNodes` module
- WHEN running `npm run test:shared`
- THEN all 14+ scenarios pass green

---

## Out of Scope

This spec MUST NOT:

- Introduce CI workflow changes (gate tightening tracked in issue #16)
- Change backend legal endpoints or markdown source files
- Support tables, images, ordered lists, italic, multi-line code blocks, external links, nested lists, footnotes, task lists, heading anchors, or HTML
- Change the legal-screen route, navigation, or `legalApi` client surface
- Alter existing Spanish UI strings in `LegalScreen.tsx`

---

## Glossary

| Term                 | Definition                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| renderer-spec node   | Abstract node type output by `tokensToNodes`; maps 1:1 to a React Native component in the presentation layer |
| graceful degradation | Rendering unknown/unsupported tokens as plain text rather than crashing or showing blank content             |
| frontmatter          | YAML metadata block at the start of a markdown file, delimited by `---` lines                                |

---

## Source / Cross-refs

- Issue #17 (source)
- Proposal: `20-proposal.md`
- Explore: `10-explore.md`
- Sole consumer: `apps/mobile/src/screens/LegalScreen.tsx`
- Backend doc files: `apps/api/src/legal/tos-v1.md`, `apps/api/src/legal/privacy-v1.md`
- Unblocks: issue #16 (audit gate to `moderate`)
