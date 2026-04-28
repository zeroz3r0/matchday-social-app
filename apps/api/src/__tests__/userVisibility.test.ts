// ============================================================================
// Public Visibility for Soft-Deleted Users (REQ-AD-5)
//
// D.4.1: GET /api/users/:id of deleted → anonymized projection
// D.4.2: GET /api/competitions/:id whose creator is deleted → creator anonymized
// D.4.3: rankings list excludes deleted users
//
// Plus pure unit tests for `userPublicProjection` helper.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    competition: {
      findUnique: vi.fn(),
    },
    matchStat: {
      aggregate: vi.fn(),
    },
    mvpResult: {
      count: vi.fn(),
    },
    playerVote: {
      aggregate: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  },
}));

import app from '../app';
import { prisma } from '../utils/prisma';
import { userPublicProjection } from '../utils/userPublicProjection';

beforeEach(() => {
  vi.clearAllMocks();
  // Aggregate stubs return zero shape so user routes don't blow up.
  (prisma.matchStat.aggregate as any).mockResolvedValue({
    _sum: { goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
    _count: 0,
  });
  (prisma.mvpResult.count as any).mockResolvedValue(0);
  (prisma.playerVote.aggregate as any).mockResolvedValue({
    _avg: { rating: null },
    _count: 0,
  });
});

// ─── Pure unit: userPublicProjection ───────────────────────────────────────

describe('userPublicProjection (pure)', () => {
  it('returns identity fields untouched when deletedAt is null', () => {
    const user = {
      id: 'u1',
      nickname: 'Lionel',
      avatarUrl: 'https://cdn/avatar.png',
      bio: 'Goleador',
      city: 'Rosario',
      position: 'FORWARD',
      deletedAt: null,
    };

    const projected = userPublicProjection(user);

    expect(projected.id).toBe('u1');
    expect(projected.nickname).toBe('Lionel');
    expect(projected.avatarUrl).toBe('https://cdn/avatar.png');
    expect(projected.bio).toBe('Goleador');
    expect(projected.city).toBe('Rosario');
  });

  it('anonymizes nickname + avatar + bio + city when deletedAt is set', () => {
    const user = {
      id: 'u2',
      nickname: 'Lionel',
      avatarUrl: 'https://cdn/avatar.png',
      bio: 'Goleador',
      city: 'Rosario',
      position: 'FORWARD',
      deletedAt: new Date('2026-04-20'),
    };

    const projected = userPublicProjection(user);

    expect(projected.id).toBe('u2'); // id preserved for FK consistency
    expect(projected.nickname).toBe('Usuario eliminado');
    expect(projected.avatarUrl).toBeNull();
    expect(projected.bio).toBeNull();
    expect(projected.city).toBeNull();
  });
});

// ─── GET /api/users/:id (D.4.1) ────────────────────────────────────────────

describe('GET /api/users/:id with soft-deleted user', () => {
  it('returns 200 with anonymized projection for deleted user (D.4.1)', async () => {
    const deletedUser = {
      id: 'user-gone',
      nickname: 'OriginalNick',
      avatarUrl: 'https://cdn/old.png',
      position: 'FORWARD',
      bio: 'Original bio',
      city: 'Buenos Aires',
      createdAt: new Date('2025-01-01'),
      deletedAt: new Date('2026-04-20'),
    };
    (prisma.user.findUnique as any).mockResolvedValue(deletedUser);

    const res = await request(app).get('/api/users/user-gone');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('user-gone');
    expect(res.body.data.nickname).toBe('Usuario eliminado');
    expect(res.body.data.avatarUrl).toBeNull();
    expect(res.body.data.bio).toBeNull();
    expect(res.body.data.city).toBeNull();
  });

  it('returns 200 with normal projection for active user (triangulation)', async () => {
    const activeUser = {
      id: 'user-active',
      nickname: 'Active',
      avatarUrl: 'https://cdn/me.png',
      position: 'FORWARD',
      bio: 'Vivo y coleando',
      city: 'Rosario',
      createdAt: new Date('2025-01-01'),
      deletedAt: null,
    };
    (prisma.user.findUnique as any).mockResolvedValue(activeUser);

    const res = await request(app).get('/api/users/user-active');

    expect(res.status).toBe(200);
    expect(res.body.data.nickname).toBe('Active');
    expect(res.body.data.avatarUrl).toBe('https://cdn/me.png');
    expect(res.body.data.bio).toBe('Vivo y coleando');
    expect(res.body.data.city).toBe('Rosario');
  });
});

// ─── GET /api/competitions/:id with deleted creator (D.4.2) ────────────────

describe('GET /api/competitions/:id with deleted creator', () => {
  it('anonymizes creator nickname when creator.deletedAt is set (D.4.2)', async () => {
    const competition = {
      id: 'c1',
      name: 'Liga Test',
      type: 'LEAGUE',
      gameType: 'F7',
      description: null,
      startDate: new Date('2026-05-01'),
      endDate: null,
      maxPostponeDays: 14,
      createdById: 'creator-gone',
      latitude: -34.6,
      longitude: -58.4,
      city: 'Buenos Aires',
      createdAt: new Date('2026-04-01'),
      updatedAt: new Date('2026-04-01'),
      createdBy: {
        id: 'creator-gone',
        nickname: 'OriginalCreator',
        deletedAt: new Date('2026-04-20'),
      },
      clubs: [],
    };
    (prisma.competition.findUnique as any).mockResolvedValue(competition);

    const res = await request(app).get('/api/competitions/c1');

    expect(res.status).toBe(200);
    expect(res.body.data.createdBy.id).toBe('creator-gone');
    expect(res.body.data.createdBy.nickname).toBe('Usuario eliminado');
  });

  it('keeps creator nickname when creator is active (triangulation)', async () => {
    const competition = {
      id: 'c2',
      name: 'Liga Activa',
      type: 'LEAGUE',
      gameType: 'F7',
      description: null,
      startDate: new Date('2026-05-01'),
      endDate: null,
      maxPostponeDays: 14,
      createdById: 'creator-alive',
      latitude: -34.6,
      longitude: -58.4,
      city: 'Buenos Aires',
      createdAt: new Date('2026-04-01'),
      updatedAt: new Date('2026-04-01'),
      createdBy: {
        id: 'creator-alive',
        nickname: 'AliveCreator',
        deletedAt: null,
      },
      clubs: [],
    };
    (prisma.competition.findUnique as any).mockResolvedValue(competition);

    const res = await request(app).get('/api/competitions/c2');

    expect(res.status).toBe(200);
    expect(res.body.data.createdBy.nickname).toBe('AliveCreator');
  });
});

// ─── GET /api/rankings (D.4.3) — filter deleted ────────────────────────────

describe('GET /api/rankings filters deleted users', () => {
  it('SQL query for rankings excludes deleted users via deleted_at IS NULL clause', async () => {
    (prisma.$queryRawUnsafe as any).mockResolvedValue([]);

    await request(app).get('/api/rankings').query({
      category: 'GOALS',
      scope: 'NATIONAL',
    });

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const sql = (prisma.$queryRawUnsafe as any).mock.calls[0][0] as string;
    // Must filter deleted users from the rankings list (REQ-AD-5).
    expect(sql).toMatch(/u\.deleted_at\s+IS\s+NULL/i);
  });
});
