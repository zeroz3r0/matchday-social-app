import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { marked } from 'marked';
import { parseMarkdown, tokensToNodes } from '../tokensToNodes';
import type { InlineNode, RenderNode } from '../types';

// Helpers ---------------------------------------------------------------------

function lex(src: string) {
  return marked.lexer(src);
}

function inlinesOf(node: RenderNode): InlineNode[] {
  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
    return node.children;
  }
  throw new Error(`node has no inline children: ${node.type}`);
}

// Tests -----------------------------------------------------------------------

describe('tokensToNodes — block features', () => {
  it('1. transforms `# H1` to heading level 1', () => {
    const nodes = tokensToNodes(lex('# Hello'));
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(inlinesOf(nodes[0]!)).toEqual([{ type: 'text', value: 'Hello' }]);
  });

  it('2. transforms `## H2` to heading level 2', () => {
    const nodes = tokensToNodes(lex('## Hello'));
    expect(nodes[0]).toMatchObject({ type: 'heading', level: 2 });
  });

  it('3. transforms `### H3` to heading level 3', () => {
    const nodes = tokensToNodes(lex('### Hello'));
    expect(nodes[0]).toMatchObject({ type: 'heading', level: 3 });
  });

  it('4. transforms a paragraph to a paragraph node with text inline child', () => {
    const nodes = tokensToNodes(lex('A plain paragraph.'));
    expect(nodes[0]).toMatchObject({ type: 'paragraph' });
    expect(inlinesOf(nodes[0]!)).toEqual([{ type: 'text', value: 'A plain paragraph.' }]);
  });

  it('5. transforms `**bold**` to a nested strong inline with text child', () => {
    const nodes = tokensToNodes(lex('Hello **world** today'));
    const inlines = inlinesOf(nodes[0]!);
    const strong = inlines.find((n): n is Extract<InlineNode, { type: 'strong' }> => n.type === 'strong');
    expect(strong).toBeDefined();
    expect(strong!.children).toEqual([{ type: 'text', value: 'world' }]);
  });

  it('6. transforms an unordered list to list node with two ListItem entries', () => {
    const nodes = tokensToNodes(lex('- one\n- two'));
    expect(nodes[0]).toMatchObject({ type: 'list', ordered: false });
    const list = nodes[0] as Extract<RenderNode, { type: 'list' }>;
    expect(list.items).toHaveLength(2);
    expect(list.items[0]!.children[0]).toMatchObject({ type: 'text', value: 'one' });
    expect(list.items[1]!.children[0]).toMatchObject({ type: 'text', value: 'two' });
  });

  it('7. transforms `` `inline code` `` to a codespan inline', () => {
    const nodes = tokensToNodes(lex('Use `npm test` daily'));
    const inlines = inlinesOf(nodes[0]!);
    const code = inlines.find((n): n is Extract<InlineNode, { type: 'codespan' }> => n.type === 'codespan');
    expect(code).toBeDefined();
    expect(code!.value).toBe('npm test');
  });

  it('8. transforms `> quote text` to a blockquote node with inline children', () => {
    const nodes = tokensToNodes(lex('> Important note'));
    expect(nodes[0]).toMatchObject({ type: 'blockquote' });
    const inlines = inlinesOf(nodes[0]!);
    const text = inlines.find((n): n is Extract<InlineNode, { type: 'text' }> => n.type === 'text');
    expect(text).toBeDefined();
    expect(text!.value).toContain('Important note');
  });

  it('9. transforms `---` (mid-document, alone) to an hr node', () => {
    const nodes = tokensToNodes(lex('Para one\n\n---\n\nPara two'));
    const hasHr = nodes.some((n) => n.type === 'hr');
    expect(hasHr).toBe(true);
  });
});

describe('parseMarkdown — frontmatter integration', () => {
  it('10. strips frontmatter then transforms (heading-only output)', () => {
    const nodes = parseMarkdown('---\ntitle: ToS\n---\n# Body');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(inlinesOf(nodes[0]!)).toEqual([{ type: 'text', value: 'Body' }]);
  });

  it('11. processes markdown without frontmatter unchanged', () => {
    const nodes = parseMarkdown('# NoFrontmatter');
    expect(nodes[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(inlinesOf(nodes[0]!)).toEqual([{ type: 'text', value: 'NoFrontmatter' }]);
  });

  it('12. preserves mid-document hr after body content', () => {
    const nodes = parseMarkdown('# Title\n\nPara\n\n---\n\nMore');
    const hasHr = nodes.some((n) => n.type === 'hr');
    expect(hasHr).toBe(true);
  });
});

describe('tokensToNodes — graceful degradation and edge cases', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('13. renders link as plain text and dev-warns', () => {
    const nodes = parseMarkdown('[click](https://example.com)');
    const inlines = inlinesOf(nodes[0]!);
    const text = inlines.find((n): n is Extract<InlineNode, { type: 'text' }> => n.type === 'text');
    expect(text).toBeDefined();
    expect(text!.value).toBe('click');
    expect(warnSpy).toHaveBeenCalled();
    const warnedWith = warnSpy.mock.calls.flat().join(' ');
    expect(warnedWith).toContain('link');
  });

  it('14. handles empty input by returning an empty array (no crash)', () => {
    expect(parseMarkdown('')).toEqual([]);
  });

  it('15. preserves non-ASCII content (emoji, ñ, accented vowels) verbatim', () => {
    const src = 'Aviso ⚠️ con ñ y vocales áéíóú';
    const nodes = parseMarkdown(src);
    const inlines = inlinesOf(nodes[0]!);
    const text = inlines.find((n): n is Extract<InlineNode, { type: 'text' }> => n.type === 'text');
    expect(text).toBeDefined();
    expect(text!.value).toBe(src);
  });
});
