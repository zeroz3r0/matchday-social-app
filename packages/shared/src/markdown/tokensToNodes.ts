// ============================================================================
// tokensToNodes — Pure transform: marked Token[] -> RenderNode[]
// ----------------------------------------------------------------------------
// No React, no RN. Vitest-testable. Unknown tokens degrade to plain text and
// emit `console.warn` in non-production builds (per design §7).
// ============================================================================

import { marked, type Token, type Tokens } from 'marked';
import { stripFrontmatter } from './stripFrontmatter';
import type { InlineNode, ListItemNode, RenderNode } from './types';

// ----- dev-warn --------------------------------------------------------------

function warnUnknown(tokenType: string): void {
  if (process.env['NODE_ENV'] !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[MarkdownRenderer] unsupported token: ${tokenType}`);
  }
}

// ----- inline transform ------------------------------------------------------

function inlineTokensToNodes(tokens: Token[] | undefined): InlineNode[] {
  if (!tokens || tokens.length === 0) return [];
  const out: InlineNode[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case 'text': {
        const t = tok as Tokens.Text;
        // Nested inline tokens inside text (e.g., text containing `strong`)
        if (t.tokens && t.tokens.length > 0) {
          out.push(...inlineTokensToNodes(t.tokens));
        } else {
          out.push({ type: 'text', value: t.text });
        }
        break;
      }
      case 'strong': {
        const t = tok as Tokens.Strong;
        out.push({ type: 'strong', children: inlineTokensToNodes(t.tokens) });
        break;
      }
      case 'codespan': {
        const t = tok as Tokens.Codespan;
        out.push({ type: 'codespan', value: t.text });
        break;
      }
      case 'link': {
        const t = tok as Tokens.Link;
        warnUnknown('link');
        out.push({ type: 'text', value: t.text });
        break;
      }
      case 'br': {
        out.push({ type: 'text', value: '\n' });
        break;
      }
      case 'escape': {
        const t = tok as Tokens.Escape;
        out.push({ type: 'text', value: t.text });
        break;
      }
      default: {
        // em, image, html, del, etc. — all unknown inline
        warnUnknown(tok.type);
        const raw = (tok as { raw?: string; text?: string }).raw ??
          (tok as { text?: string }).text ?? '';
        out.push({ type: 'text', value: raw });
      }
    }
  }
  return out;
}

// ----- block transform -------------------------------------------------------

export function tokensToNodes(tokens: Token[]): RenderNode[] {
  const out: RenderNode[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case 'heading': {
        const t = tok as Tokens.Heading;
        if (t.depth === 1 || t.depth === 2 || t.depth === 3) {
          out.push({
            type: 'heading',
            level: t.depth,
            children: inlineTokensToNodes(t.tokens),
          });
        } else {
          warnUnknown('heading');
          out.push({ type: 'unknown', raw: t.raw, tokenType: 'heading' });
        }
        break;
      }
      case 'paragraph': {
        const t = tok as Tokens.Paragraph;
        out.push({ type: 'paragraph', children: inlineTokensToNodes(t.tokens) });
        break;
      }
      case 'blockquote': {
        const t = tok as Tokens.Blockquote;
        // Blockquote children are block tokens; flatten any paragraph inlines
        // into a single inline child set for our renderer-spec.
        const inlines: InlineNode[] = [];
        for (const child of t.tokens ?? []) {
          if (child.type === 'paragraph') {
            inlines.push(...inlineTokensToNodes((child as Tokens.Paragraph).tokens));
          } else if (child.type === 'text') {
            const tc = child as Tokens.Text;
            if (tc.tokens && tc.tokens.length > 0) {
              inlines.push(...inlineTokensToNodes(tc.tokens));
            } else {
              inlines.push({ type: 'text', value: tc.text });
            }
          }
        }
        out.push({ type: 'blockquote', children: inlines });
        break;
      }
      case 'list': {
        const t = tok as Tokens.List;
        if (t.ordered) {
          warnUnknown('list');
          out.push({ type: 'unknown', raw: t.raw, tokenType: 'list' });
          break;
        }
        const items: ListItemNode[] = t.items.map((item) => {
          // A list_item may contain block tokens (paragraph wrappers) or inlines
          const inlines: InlineNode[] = [];
          for (const child of item.tokens ?? []) {
            if (child.type === 'paragraph') {
              inlines.push(...inlineTokensToNodes((child as Tokens.Paragraph).tokens));
            } else if (child.type === 'text') {
              const tc = child as Tokens.Text;
              if (tc.tokens && tc.tokens.length > 0) {
                inlines.push(...inlineTokensToNodes(tc.tokens));
              } else {
                inlines.push({ type: 'text', value: tc.text });
              }
            }
          }
          return { children: inlines };
        });
        out.push({ type: 'list', ordered: false, items });
        break;
      }
      case 'hr': {
        out.push({ type: 'hr' });
        break;
      }
      case 'space': {
        // skip whitespace-only blocks
        break;
      }
      case 'code':
      case 'table':
      case 'html':
      case 'def':
      case 'em':
      case 'image': {
        warnUnknown(tok.type);
        const raw = (tok as { raw?: string }).raw ?? '';
        out.push({ type: 'unknown', raw, tokenType: tok.type });
        break;
      }
      default: {
        warnUnknown(tok.type);
        const raw = (tok as { raw?: string }).raw ?? '';
        out.push({ type: 'unknown', raw, tokenType: tok.type });
      }
    }
  }
  return out;
}

// ----- entry point -----------------------------------------------------------

export function parseMarkdown(source: string): RenderNode[] {
  if (!source) return [];
  const stripped = stripFrontmatter(source);
  if (!stripped) return [];
  const tokens = marked.lexer(stripped);
  return tokensToNodes(tokens);
}
