// ============================================================================
// Markdown renderer-spec node types
// ----------------------------------------------------------------------------
// Discriminated unions emitted by `tokensToNodes`. Pure data — no React, no RN.
// `level` constrained to 1-3 per spec allowlist.
// `ordered: false` literal — ordered lists out of scope.
// `InlineNode` has no `link` variant — links degrade to `text` per design D6.
// ============================================================================

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
export interface ListItemNode {
  children: InlineNode[];
}
