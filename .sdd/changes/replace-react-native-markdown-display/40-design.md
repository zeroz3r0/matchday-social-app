# Design: replace-react-native-markdown-display

> **topic_key**: `sdd/replace-react-native-markdown-display/design`
> **type**: `architecture`
> **status**: `active`
> **last synced**: 2026-05-02

---

## 1. Architecture Overview

Three-layer architecture with strict separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────┐
│  apps/mobile                                                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  LegalScreen.tsx                                              │  │
│  │  - Passes markdown string + style dict to MarkdownRenderer    │  │
│  │  - Owns `mdStyles` (visual tokens, unchanged from current)    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  components/MarkdownRenderer.tsx     [PRESENTATION LAYER]     │  │
│  │  - Imports tokensToNodes from @matchday/shared                │  │
│  │  - Calls marked.lexer(source) → Token[]                       │  │
│  │  - Calls tokensToNodes(tokens) → RenderNode[]                 │  │
│  │  - Maps RenderNode[] to <Text>/<View> with styles             │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  packages/shared                                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  markdown/tokensToNodes.ts           [TRANSFORM LAYER]        │  │
│  │  - Pure function: Token[] → RenderNode[]                      │  │
│  │  - Calls stripFrontmatter() before lexer                      │  │
│  │  - Dev-warn on unknown tokens                                 │  │
│  │  - NO React, NO RN — testable with Vitest                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  markdown/stripFrontmatter.ts        [UTILITY]                │  │
│  │  - Regex strip of leading YAML block                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  node_modules/marked@^18                [PARSE LAYER]               │
│  - string → marked.Tokens.Token[] AST                               │
│  - Zero deps, zero advisories                                       │
└─────────────────────────────────────────────────────────────────────┘
```

The transform layer is pure JS/TS with no RN dependencies, enabling strict TDD via Vitest. The presentation layer is thin RN-specific code that consumes the abstract `RenderNode[]` output.

---

## 2. Type Definitions

```ts
// packages/shared/src/markdown/types.ts

/** Block-level node emitted by tokensToNodes */
export type RenderNode =
  | { type: 'heading'; level: 1 | 2 | 3; children: InlineNode[] }
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'list'; ordered: false; items: ListItemNode[] }
  | { type: 'blockquote'; children: InlineNode[] }
  | { type: 'hr' }
  | { type: 'unknown'; raw: string; tokenType: string };

/** Inline node within a block */
export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: InlineNode[] }
  | { type: 'codespan'; value: string };

/** List item containing inline content */
export type ListItemNode = { children: InlineNode[] };
```

**Design decisions for types:**

- `level` constrained to `1 | 2 | 3` per spec's H1/H2/H3-only rule — TS catches drift.
- `unknown` carries `tokenType` for the dev-warn path.
- `InlineNode` has no `link` variant — links degrade to `text` + dev-warn per spec.
- `ordered: false` literal (not `boolean`) — ordered lists not supported, TS enforces.

---

## 3. Module Layout

```
packages/shared/src/markdown/
├── index.ts                   # barrel: exports tokensToNodes, stripFrontmatter, types
├── types.ts                   # RenderNode, InlineNode, ListItemNode
├── tokensToNodes.ts           # pure transform (≤200 lines)
├── stripFrontmatter.ts        # regex helper
└── __tests__/
    ├── tokensToNodes.test.ts  # ≥14 scenarios per spec
    └── stripFrontmatter.test.ts

packages/shared/src/index.ts   # ADD: export * from './markdown';

apps/mobile/src/components/
└── MarkdownRenderer.tsx       # RN presentation (≤200 lines)

apps/mobile/src/screens/
└── LegalScreen.tsx            # MODIFY: swap import, keep mdStyles in-file

apps/mobile/package.json       # ADD: marked@^18, REMOVE: react-native-markdown-display
package-lock.json              # REGENERATE
```

---

## 4. Public API

### `packages/shared/src/markdown/index.ts`

```ts
export { tokensToNodes, parseMarkdown } from './tokensToNodes';
export { stripFrontmatter } from './stripFrontmatter';
export type { RenderNode, InlineNode, ListItemNode } from './types';
```

### `packages/shared/src/markdown/tokensToNodes.ts`

```ts
import type { Token } from 'marked';
import type { RenderNode } from './types';

/**
 * Transforms marked Token[] AST into renderer-spec RenderNode[].
 * Pure function — no side effects except dev-warn console.warn.
 */
export function tokensToNodes(tokens: Token[]): RenderNode[];

/**
 * Convenience: strips frontmatter + lexes + transforms.
 * Entry point for consumers who don't need raw token access.
 */
export function parseMarkdown(source: string): RenderNode[];
```

### `apps/mobile/src/components/MarkdownRenderer.tsx`

```tsx
import type { TextStyle, ViewStyle } from 'react-native';

export interface MarkdownStyleDict {
  body?: TextStyle;
  heading1?: TextStyle;
  heading2?: TextStyle;
  heading3?: TextStyle;
  paragraph?: TextStyle;
  strong?: TextStyle;
  bullet_list?: ViewStyle;
  list_item?: TextStyle;
  blockquote?: ViewStyle;
  code_inline?: TextStyle;
  hr?: ViewStyle;
}

export interface MarkdownRendererProps {
  source: string;
  styles: MarkdownStyleDict;
}

export function MarkdownRenderer(props: MarkdownRendererProps): React.JSX.Element;
```

Style keys mirror the existing `mdStyles` shape for 1:1 migration.

---

## 5. Token → RenderNode Mapping

| `marked` Token         | RenderNode                                   | Children        | Supported |
| ---------------------- | -------------------------------------------- | --------------- | --------- |
| `heading` (depth 1-3)  | `{ type: 'heading', level }`                 | inline recursed | ✅        |
| `heading` (depth 4-6)  | `{ type: 'unknown', tokenType: 'heading' }`  | raw             | ⚠️        |
| `paragraph`            | `{ type: 'paragraph' }`                      | inline recursed | ✅        |
| `strong`               | `{ type: 'strong' }` (inline)                | inline recursed | ✅        |
| `codespan`             | `{ type: 'codespan' }` (inline)              | text only       | ✅        |
| `blockquote`           | `{ type: 'blockquote' }`                     | inline recursed | ✅        |
| `list` (ordered=false) | `{ type: 'list', ordered: false }`           | ListItemNode[]  | ✅        |
| `list` (ordered=true)  | `{ type: 'unknown', tokenType: 'list' }`     | raw             | ⚠️        |
| `list_item`            | `ListItemNode`                               | inline recursed | ✅        |
| `hr`                   | `{ type: 'hr' }`                             | —               | ✅        |
| `text`                 | `{ type: 'text' }` (inline)                  | —               | ✅        |
| `link`                 | `{ type: 'text', value: token.text }` + warn | —               | ⚠️        |
| `em`                   | `{ type: 'unknown', tokenType: 'em' }`       | raw             | ⚠️        |
| `code` (fenced)        | `{ type: 'unknown', tokenType: 'code' }`     | raw             | ⚠️        |
| `image`                | `{ type: 'unknown', tokenType: 'image' }`    | alt             | ⚠️        |
| `table`                | `{ type: 'unknown', tokenType: 'table' }`    | raw             | ⚠️        |
| `html`                 | `{ type: 'unknown', tokenType: 'html' }`     | raw             | ⚠️        |
| `space`                | (skipped)                                    | —               | ✅        |
| `br`                   | `{ type: 'text', value: '\n' }`              | —               | ✅        |

---

## 6. Frontmatter Strip

**File**: `packages/shared/src/markdown/stripFrontmatter.ts`

```ts
const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export function stripFrontmatter(source: string): string {
  return source.replace(FRONTMATTER_REGEX, '');
}
```

- Anchored to string start (`^`)
- Handles LF and CRLF
- Non-greedy body match
- Mid-document `---` preserved (not anchored)
- Called inside `parseMarkdown` before `marked.lexer`

**Test cases**: with frontmatter, without, mid-document `---`, empty string, frontmatter-only.

---

## 7. Dev-warn Path

```ts
// In tokensToNodes.ts
function warnUnknown(tokenType: string): void {
  if (process.env['NODE_ENV'] !== 'production') {
    console.warn(`[MarkdownRenderer] unsupported token: ${tokenType}`);
  }
}
```

Uses `process.env['NODE_ENV']` for portability across `packages/shared` (Vitest) and mobile (Metro).

---

## 8. Presentation Layer Details

`MarkdownRenderer.tsx`:

- Function component, no hooks (repo convention)
- Single pass: `parseMarkdown(source)` → map → JSX
- Block nodes: `<View>` containers
- Inline nodes: nested `<Text>` runs (RN text-flow requirement)
- `hr`: `<View style={styles.hr} />`
- `bullet_list`: `<View style={styles.bullet_list}>` containing `<Text>• {item}</Text>` per item
- `blockquote`: `<View style={styles.blockquote}><Text>{children}</Text></View>`
- `code_inline`: `<Text style={styles.code_inline}>{value}</Text>` inside parent text

---

## 9. Error Handling

| Case                      | Behavior                                                             |
| ------------------------- | -------------------------------------------------------------------- |
| Empty source              | Return empty fragment (no crash)                                     |
| `marked.lexer` throws     | try/catch → render plain source as `<Text>` + `console.error` in dev |
| Unknown token             | `RenderNode.unknown` + dev-warn (see §7)                             |
| Very long source (>50 KB) | No special handling; ScrollView in LegalScreen provides scroll       |

If `captureException` is available from `apps/mobile/src/lib/sentry.ts`, use it in the catch path. Verify in apply phase.

---

## 10. Migration Diff

**LegalScreen.tsx (before)**:

```tsx
import Markdown from 'react-native-markdown-display';
// ...
<Markdown style={mdStyles}>{content ?? ''}</Markdown>
// ...
const mdStyles = { body: {...}, ... };
```

**LegalScreen.tsx (after)**:

```tsx
import { MarkdownRenderer, type MarkdownStyleDict } from '../components/MarkdownRenderer';
// ...
<MarkdownRenderer source={content ?? ''} styles={mdStyles} />
// ...
const mdStyles: MarkdownStyleDict = { body: {...}, ... };
```

`mdStyles` stays in `LegalScreen.tsx` (single source of visual truth at consumer). Type-annotate with `MarkdownStyleDict`.

---

## 11. Decisions Log

| #   | Decision                            | Rationale                                       |
| --- | ----------------------------------- | ----------------------------------------------- |
| D1  | `marked@^18`                        | Zero deps, zero advisories, actively maintained |
| D2  | Pure transform in `packages/shared` | Enables Vitest TDD; mobile has no test runner   |
| D3  | Style keys mirror `mdStyles`        | Zero-friction migration, one-line swap          |
| D4  | Frontmatter strip in transform      | Belt + suspenders per explore Q2                |
| D5  | Unknown → plain text + dev-warn     | Per spec graceful degradation                   |
| D6  | Link drops URL                      | Spec out-of-scope; future change adds Linking   |
| D7  | `RenderNode` discriminated union    | Pure data, easy to test, exhaustive switch      |
| D8  | No memoization in renderer          | Repo convention (React 19 + Compiler)           |
| D9  | `process.env['NODE_ENV']` for warn  | Portable across shared + mobile                 |
| D10 | `mdStyles` stays in LegalScreen     | Consumer owns visual tokens                     |
| D11 | Separate commits for barrel export  | Enables selective revert if needed              |

---

## 12. Rollback Plan

Per proposal: `git revert <merge-sha> && rm -rf node_modules apps/mobile/node_modules && npm install`.

**Design-specific mitigation**: The barrel export change (`export * from './markdown';` in `packages/shared/src/index.ts`) ships in a SEPARATE small commit so revert can be selective. Revert includes reverting this line to prevent broken imports to orphaned files.

---

## 13. Risks (from proposal, with design mitigation)

| ID  | Risk                     | Design Mitigation                                      |
| --- | ------------------------ | ------------------------------------------------------ |
| R1  | Style token drift        | Mapping table in §5; `MarkdownStyleDict` enforces keys |
| R2  | `marked` AST coupling    | Single adapter file `tokensToNodes.ts`; pin `^18`      |
| R3  | Frontmatter not stripped | Defensive strip in transform layer (§6)                |
| R5  | Inline emoji             | `<Text>` handles natively; verify phase checks         |
| R6  | Lint cap (196)           | Apply runs lint per commit                             |
| R7  | Metro cache              | PR body: `npx expo start -c`                           |
| R8  | Future scope creep       | Spec allowlist; expansion = new SDD change             |

---

## 14. Open Questions for Apply

1. Confirm `marked@18` token type names match §5 table — check `node_modules/marked/lib/marked.d.ts` after install
2. Confirm `captureException` available from `apps/mobile/src/lib/sentry.ts` for lexer catch path
3. Confirm `__DEV__` vs `process.env.NODE_ENV` behavior in mobile — test dev-warn path

---

## 15. Addendum — `mdStyles` cleanup during migration (orchestrator decision, 2026-05-02)

The spec phase flagged three style keys in the current `LegalScreen.tsx` `mdStyles` block (lines 135-179) that need explicit treatment in the migration. Resolution:

| Style key       | Used by current legal docs? | Allowed by spec allowlist?      | Decision in `MarkdownStyleDict` and `mdStyles`                                                                                                         |
| --------------- | --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `heading3` (H3) | NO                          | YES                             | **KEEP** — defensive, zero cost, matches spec allowlist of H1-H3. Future legal-doc revisions may add H3 without requiring code change.                 |
| `em` (italic)   | NO                          | NO (italic out of scope)        | **DROP** from `mdStyles` and from `MarkdownStyleDict` — dead code. If italic is ever needed, it requires its own SDD change to re-enter the allowlist. |
| `ordered_list`  | NO                          | NO (ordered lists out of scope) | **DROP** from `mdStyles` and from `MarkdownStyleDict` — dead code, same justification as `em`.                                                         |

This keeps `MarkdownStyleDict` honest: every key it exposes corresponds to a feature the renderer actually emits. Apply phase performs both drops as part of the `LegalScreen.tsx` migration commit.

Other `mdStyles` keys retained (all map 1:1 to spec-allowed features): `body`, `heading1`, `heading2`, `heading3`, `paragraph`, `link` (rendered as plain text per D6, but the style key is harmless to keep — a future Linking-enabled change can use it without re-introducing it), `strong`, `bullet_list`, `list_item`, `blockquote`, `code_inline`, `hr`.

NOTE on `link`: per spec the renderer emits `link` token text as a plain `text` node, NOT a styled `link` node. The `link` style key in `mdStyles` is therefore **inert** today — it does nothing. Decision: **KEEP** the key (consistency with future Linking change) but document its current no-op state in a code comment in `LegalScreen.tsx`. If preferred for cleanliness, drop it now; orchestrator leaves the call to apply phase but recommends KEEP for forward-compat.

---

## Source / Cross-refs

- Spec: `30-spec.md`
- Proposal: `20-proposal.md`
- Explore: `10-explore.md`
- Consumer: `apps/mobile/src/screens/LegalScreen.tsx`
