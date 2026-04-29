// ============================================================================
// HMAC-SHA256 signed export tokens (REQ-DE-2)
//
// Token shape: `<base64url(payloadJson)>.<base64url(hmacSig)>`
// Payload: { userId, exportId, expiresAt }   (expiresAt = epoch ms)
//
// `verifyExportToken` runs in three stages:
//   1. Split into payload + signature (malformed → fail).
//   2. Recompute HMAC and constant-time compare (mismatch → fail).
//   3. Parse payload JSON + check expiry.
//
// Secret comes from `EXPORT_SIGNING_SECRET`. Missing in prod is a deployment
// error; in test/dev we fall back to a deterministic placeholder so unit
// tests stay reproducible without env wiring.
// ============================================================================

import crypto from 'node:crypto';

export type ExportTokenPayload = {
  userId: string;
  exportId: string;
  expiresAt: number; // epoch ms
};

type VerifyResult =
  | { valid: true; payload: ExportTokenPayload }
  | { valid: false; reason: 'malformed' | 'invalid_signature' | 'expired' };

const ALGO = 'sha256';
const FALLBACK_SECRET = 'dev-export-signing-secret-CHANGE-IN-PROD';

function getSecret(): string {
  const fromEnv = process.env['EXPORT_SIGNING_SECRET'];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return FALLBACK_SECRET;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64url');
}

function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, 'base64url');
}

export function signExportToken(payload: ExportTokenPayload): string {
  const payloadStr = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = crypto.createHmac(ALGO, getSecret()).update(payloadStr).digest();
  return `${payloadStr}.${base64UrlEncode(sig)}`;
}

export function verifyExportToken(token: string): VerifyResult {
  if (typeof token !== 'string' || token.length === 0) {
    return { valid: false, reason: 'malformed' };
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'malformed' };
  }
  const [payloadStr, sigStr] = parts;
  if (!payloadStr || !sigStr) {
    return { valid: false, reason: 'malformed' };
  }

  // Recompute and constant-time compare. Buffers must be the same length for
  // `timingSafeEqual` to work — short-circuit malformed sigs as
  // invalid_signature so we don't leak `length` info.
  const expectedSig = crypto.createHmac(ALGO, getSecret()).update(payloadStr).digest();
  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(sigStr);
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (providedSig.length !== expectedSig.length) {
    return { valid: false, reason: 'invalid_signature' };
  }
  if (!crypto.timingSafeEqual(providedSig, expectedSig)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  let payload: ExportTokenPayload;
  try {
    const json = base64UrlDecode(payloadStr).toString('utf8');
    payload = JSON.parse(json) as ExportTokenPayload;
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  if (
    typeof payload.userId !== 'string' ||
    typeof payload.exportId !== 'string' ||
    typeof payload.expiresAt !== 'number'
  ) {
    return { valid: false, reason: 'malformed' };
  }

  if (Date.now() > payload.expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, payload };
}
