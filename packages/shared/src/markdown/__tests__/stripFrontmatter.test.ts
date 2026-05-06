import { describe, it, expect } from 'vitest';
import { stripFrontmatter } from '../stripFrontmatter';

describe('stripFrontmatter', () => {
  it('strips a leading YAML frontmatter block', () => {
    const input = '---\ntitle: ToS\nversion: 1\n---\n# Body';
    expect(stripFrontmatter(input)).toBe('# Body');
  });

  it('returns input unchanged when no frontmatter is present', () => {
    const input = '# Just a heading\n\nSome paragraph.';
    expect(stripFrontmatter(input)).toBe(input);
  });

  it('preserves a mid-document horizontal rule (only leading block stripped)', () => {
    const input = '# Heading\n\nIntro paragraph.\n\n---\n\nMore content.';
    expect(stripFrontmatter(input)).toBe(input);
  });

  it('returns empty string for empty input', () => {
    expect(stripFrontmatter('')).toBe('');
  });

  it('strips frontmatter with CRLF line endings', () => {
    const input = '---\r\ntitle: ToS\r\n---\r\n# Body';
    expect(stripFrontmatter(input)).toBe('# Body');
  });
});
