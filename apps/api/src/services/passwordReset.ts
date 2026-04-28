// ============================================================================
// Password Reset Service
//
// AR-2/AR-4/AR-5 contract:
//   - `createTokenForUser` generates a 64-hex plaintext, bcrypt-hashes it
//     (cost 10), persists `PasswordResetToken { tokenHash, expiresAt: now+1h,
//     consumedAt: null }`, returns the plaintext (caller embeds in email).
//   - `consumeToken` validates plaintext: walks ACTIVE tokens
//     (`consumedAt: null`, `expiresAt > now`), bcrypt.compare each, atomically
//     marks consumed via `updateMany({ where: { id, consumedAt: null } })` —
//     race-safe (count===0 → already consumed → throw `TokenInvalidError`).
//
// Both errors (no match / race lost) surface as `TokenInvalidError` so the
// route layer can map to 400 with the same generic message (anti-enumeration).
// ============================================================================

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';

const BCRYPT_TOKEN_COST = 10;
const BCRYPT_PASSWORD_COST = 12;
const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export class TokenInvalidError extends Error {
  constructor() {
    super('Token inválido o expirado');
    this.name = 'TokenInvalidError';
  }
}

export function generatePlaintextToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex'); // 64 hex chars
}

export async function createTokenForUser(userId: string): Promise<string> {
  const plaintext = generatePlaintextToken();
  const tokenHash = await bcrypt.hash(plaintext, BCRYPT_TOKEN_COST);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return plaintext;
}

export async function consumeToken(plaintext: string, newPassword: string): Promise<void> {
  // Bcrypt is not indexable — scan the small pool of ACTIVE tokens
  // (rate-limited 3/h/email * 1h TTL → bounded). Filter by expiry +
  // unconsumed at the DB level.
  const candidates = await prisma.passwordResetToken.findMany({
    where: {
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  let matched: { id: string; userId: string } | null = null;
  for (const row of candidates) {
    const ok = await bcrypt.compare(plaintext, row.tokenHash);
    if (ok) {
      matched = { id: row.id, userId: row.userId };
      break;
    }
  }

  if (!matched) {
    throw new TokenInvalidError();
  }

  // Atomic single-use guard — race-safe at the DB level.
  // If another request consumed first, count===0 → race lost.
  const consumeResult = await prisma.passwordResetToken.updateMany({
    where: { id: matched.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  if (consumeResult.count !== 1) {
    throw new TokenInvalidError();
  }

  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_PASSWORD_COST);
  await prisma.user.update({
    where: { id: matched.userId },
    data: { password: newPasswordHash },
  });
}
