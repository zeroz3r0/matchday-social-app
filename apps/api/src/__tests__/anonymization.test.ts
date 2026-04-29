// ============================================================================
// Account Deletion Service — anonymizeUser (REQ-AD-7)
//
// Verifies:
// - User row mutated in place (nickname, email, avatar, bio, city, lat, lng
//   scrubbed). PushToken cleanup is FK-cascade — covered in pushNotifications
//   integration; see Phase D.
// - ClubMember rows for the user deleted (membership ends)
// - Match.createdById / MatchStat.playerId / PlayerVote.* /
//   Competition.createdById preserved (KEEP-anonymize, FK history kept)
// - hardDeleteUser wraps in Serializable transaction
//
// Pure logic + mocked prisma client — no real DB.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory tx mock that captures every call.
type TxCall = { table: string; op: string; arg: unknown };
let txCalls: TxCall[] = [];

function makeTxMock(userRow: Record<string, unknown> | null) {
  return {
    user: {
      findUnique: vi.fn((arg: unknown) => {
        txCalls.push({ table: 'user', op: 'findUnique', arg });
        return Promise.resolve(userRow);
      }),
      update: vi.fn((arg: unknown) => {
        txCalls.push({ table: 'user', op: 'update', arg });
        return Promise.resolve({ ...(userRow ?? {}), ...(arg as any).data });
      }),
    },
    clubMember: {
      deleteMany: vi.fn((arg: unknown) => {
        txCalls.push({ table: 'clubMember', op: 'deleteMany', arg });
        return Promise.resolve({ count: 1 });
      }),
    },
    matchPlayer: {
      deleteMany: vi.fn((arg: unknown) => {
        txCalls.push({ table: 'matchPlayer', op: 'deleteMany', arg });
        return Promise.resolve({ count: 0 });
      }),
    },
    // KEEP tables — these MUST NOT be touched by anonymizeUser.
    match: {
      deleteMany: vi.fn(() => Promise.reject(new Error('match.deleteMany should not be called'))),
      update: vi.fn(() => Promise.reject(new Error('match.update should not be called'))),
    },
    matchStat: {
      deleteMany: vi.fn(() =>
        Promise.reject(new Error('matchStat.deleteMany should not be called')),
      ),
    },
    playerVote: {
      deleteMany: vi.fn(() =>
        Promise.reject(new Error('playerVote.deleteMany should not be called')),
      ),
    },
    competition: {
      deleteMany: vi.fn(() =>
        Promise.reject(new Error('competition.deleteMany should not be called')),
      ),
    },
  };
}

vi.mock('../utils/prisma', () => {
  const transactionMock = vi.fn();
  return {
    prisma: {
      $transaction: transactionMock,
    },
  };
});

import { prisma } from '../utils/prisma';
import { anonymizeUser, hardDeleteUser } from '../services/accountDeletion';

beforeEach(() => {
  txCalls = [];
  vi.clearAllMocks();
});

// ─── anonymizeUser — direct (no tx wrapping) ───────────────────────────────

describe('anonymizeUser', () => {
  it('scrubs personal fields on User row (D.5.1 — REQ-AD-7)', async () => {
    const tx = makeTxMock({
      id: 'user-bye',
      email: 'bye@example.com',
      nickname: 'OriginalNick',
      avatarUrl: 'https://cdn/me.png',
      bio: 'bio',
      city: 'Rosario',
      latitude: -34.6,
      longitude: -58.4,
    });

    await anonymizeUser('user-bye', tx as any);

    expect(tx.user.update).toHaveBeenCalledTimes(1);
    const updateCall = (tx.user.update.mock.calls[0]?.[0] ?? {}) as any;
    expect(updateCall.where).toEqual({ id: 'user-bye' });
    // Nickname goes to a unique-safe DB value; projection layer maps it to
    // "Usuario eliminado" at read time (design §4.3).
    expect(updateCall.data.nickname).toMatch(/^usuario_eliminado_[a-z0-9]+/i);
    expect(updateCall.data.email).toBe('deleted-user-bye@matchday.local');
    expect(updateCall.data.avatarUrl).toBeNull();
    expect(updateCall.data.bio).toBeNull();
    expect(updateCall.data.city).toBeNull();
    expect(updateCall.data.latitude).toBeNull();
    expect(updateCall.data.longitude).toBeNull();
    // fcmToken removed in push-notifications-real-impl; PushToken FK cascade
    // handles cleanup at DB level.
    expect(updateCall.data).not.toHaveProperty('fcmToken');
  });

  it('deletes ClubMember rows (membership ends — REQ-AD-7)', async () => {
    const tx = makeTxMock({ id: 'user-bye' });
    await anonymizeUser('user-bye', tx as any);

    expect(tx.clubMember.deleteMany).toHaveBeenCalledTimes(1);
    const arg = (tx.clubMember.deleteMany.mock.calls[0]?.[0] ?? {}) as any;
    expect(arg.where.userId).toBe('user-bye');
  });

  it('does NOT touch match/matchStat/playerVote/competition tables (FK preserved)', async () => {
    const tx = makeTxMock({ id: 'user-bye' });
    await anonymizeUser('user-bye', tx as any);

    expect(tx.match.deleteMany).not.toHaveBeenCalled();
    expect(tx.match.update).not.toHaveBeenCalled();
    expect(tx.matchStat.deleteMany).not.toHaveBeenCalled();
    expect(tx.playerVote.deleteMany).not.toHaveBeenCalled();
    expect(tx.competition.deleteMany).not.toHaveBeenCalled();
  });

  it('throws when user not found', async () => {
    const tx = makeTxMock(null);

    await expect(anonymizeUser('ghost', tx as any)).rejects.toThrow(/not found/i);
  });
});

// ─── hardDeleteUser — wraps anonymizeUser in Serializable tx ───────────────

describe('hardDeleteUser', () => {
  it('wraps anonymizeUser in Serializable transaction with 60s timeout', async () => {
    let capturedOptions: unknown = undefined;
    (prisma.$transaction as any).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>, options: unknown) => {
        capturedOptions = options;
        const tx = makeTxMock({ id: 'user-bye' });
        return cb(tx);
      },
    );

    await hardDeleteUser('user-bye', prisma as any);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(capturedOptions).toMatchObject({
      isolationLevel: 'Serializable',
      timeout: 60_000,
    });
  });
});
