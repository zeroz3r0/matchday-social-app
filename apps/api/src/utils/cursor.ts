// ============================================================================
// Cursor Encoding — Opaque base64url cursor over (createdAt, id)
// ============================================================================
//
// Used by paginated list endpoints to encode an opaque cursor pointing at the
// last returned row. Format: base64url(`${createdAt.toISOString()}__${id}`).
// Decode returns null on malformed input — caller maps to AppError(400,
// 'INVALID_CURSOR'). Pure functions, no side effects.

export function encodeCursor(createdAt: Date, id: string): string {
  const raw = `${createdAt.toISOString()}__${id}`;
  return Buffer.from(raw, 'utf8').toString('base64url');
}

export interface DecodedCursor {
  createdAt: Date;
  id: string;
}

export function decodeCursor(raw: string): DecodedCursor | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const sep = decoded.indexOf('__');
    if (sep <= 0 || sep === decoded.length - 2) return null;

    const iso = decoded.slice(0, sep);
    const id = decoded.slice(sep + 2);
    if (!iso || !id) return null;

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    // Guard: re-encode and compare to reject inputs that decoded to garbage.
    if (d.toISOString() !== iso) return null;

    return { createdAt: d, id };
  } catch {
    return null;
  }
}
