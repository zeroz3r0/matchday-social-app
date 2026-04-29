// ============================================================================
// Legal Document Service
//
// Loads ToS + Privacy markdown from `src/legal/*.md` once at boot, parses YAML
// frontmatter (inline regex — no gray-matter dep), caches in module scope.
//
// REQ-LD-1..5: serves versioned `{ version, content }` to legal endpoints.
// REQ-TA-2: `LATEST_*_VERSION()` used by register handler for version match.
// ============================================================================

import fs from 'fs';
import path from 'path';

export type LegalDoc = {
  version: string;
  publishedAt: string;
  locale: string;
  content: string;
};

let tosCache: LegalDoc | null = null;
let privacyCache: LegalDoc | null = null;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function parseFrontmatter(raw: string): LegalDoc {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { version: 'v0', publishedAt: '', locale: 'es', content: raw };
  }
  const [, header, body] = match;
  const meta: Record<string, string> = {};
  if (header) {
    for (const line of header.split(/\r?\n/)) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) meta[key] = value;
    }
  }
  return {
    version: meta['version'] ?? 'v0',
    publishedAt: meta['publishedAt'] ?? '',
    locale: meta['locale'] ?? 'es',
    content: body ?? '',
  };
}

function loadDoc(filename: string): LegalDoc {
  const filePath = path.join(__dirname, '..', 'legal', filename);
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseFrontmatter(raw);
}

export function initLegal(): void {
  tosCache = loadDoc('tos-v1.md');
  privacyCache = loadDoc('privacy-v1.md');
}

export function getTos(): LegalDoc {
  if (!tosCache) tosCache = loadDoc('tos-v1.md');
  return tosCache;
}

export function getPrivacy(): LegalDoc {
  if (!privacyCache) privacyCache = loadDoc('privacy-v1.md');
  return privacyCache;
}

export function LATEST_TOS_VERSION(): string {
  return getTos().version;
}

export function LATEST_PRIVACY_VERSION(): string {
  return getPrivacy().version;
}

// Test hook — reset caches between vitest cases.
export function __resetLegalCacheForTests(): void {
  tosCache = null;
  privacyCache = null;
}
