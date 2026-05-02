// ============================================================================
// stripFrontmatter — Defensive YAML frontmatter strip
// ----------------------------------------------------------------------------
// Removes a leading YAML frontmatter block delimited by `---` lines.
// Anchored to string start, non-greedy, CRLF-tolerant. Mid-document `---`
// is preserved (not anchored).
// ============================================================================

const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export function stripFrontmatter(source: string): string {
  return source.replace(FRONTMATTER_REGEX, '');
}
