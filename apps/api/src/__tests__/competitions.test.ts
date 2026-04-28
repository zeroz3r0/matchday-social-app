// ============================================================================
// Competition Routes — List & Detail Endpoints
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import app from '../app';

// ─── Mock Prisma ───────────────────────────────────────────────────────────

vi.mock('../utils/prisma', () => ({
  prisma: {
    competition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    clubMember: {
      count: vi.fn(),
    },
    competitionClub: {
      create: vi.fn(),
    },
    leagueStanding: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../utils/prisma';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeCompetition(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const createdAt = new Date('2026-04-20T12:00:00.000Z');
  return {
    id: 'comp-1',
    name: 'Liga Verano 2026',
    type: 'LEAGUE',
    gameType: 'F7',
    description: null,
    startDate: new Date('2026-05-01T18:00:00.000Z'),
    endDate: null,
    maxPostponeDays: 14,
    createdById: 'user-1',
    latitude: -34.6,
    longitude: -58.4,
    city: 'Buenos Aires',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

// ─── GET /api/competitions/:id (Detail) ────────────────────────────────────

describe('GET /api/competitions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with competition + creator + clubs', async () => {
    const c = {
      ...makeCompetition({ id: 'c1' }),
      createdBy: { id: 'user-1', nickname: 'JuanP' },
      clubs: [
        {
          id: 'cc-1',
          competitionId: 'c1',
          clubId: 'club-A',
          registeredAt: new Date('2026-04-21T10:00:00.000Z'),
          club: { id: 'club-A', name: 'Club A', badgeUrl: null },
        },
      ],
    };
    (prisma.competition.findUnique as any).mockResolvedValue(c);

    const res = await request(app).get('/api/competitions/c1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('c1');
    expect(res.body.data.createdBy).toEqual({ id: 'user-1', nickname: 'JuanP' });
    expect(Array.isArray(res.body.data.clubs)).toBe(true);
    expect(res.body.data.clubs).toHaveLength(1);
    expect(res.body.data.clubs[0].clubId).toBe('club-A');
  });

  it('returns 200 with empty clubs array when no registrations', async () => {
    const c = {
      ...makeCompetition({ id: 'c2' }),
      createdBy: { id: 'user-1', nickname: 'JuanP' },
      clubs: [],
    };
    (prisma.competition.findUnique as any).mockResolvedValue(c);

    const res = await request(app).get('/api/competitions/c2');

    expect(res.status).toBe(200);
    expect(res.body.data.clubs).toEqual([]);
  });

  it('returns 404 NOT_FOUND when competition does not exist', async () => {
    (prisma.competition.findUnique as any).mockResolvedValue(null);

    const res = await request(app).get('/api/competitions/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('passes correct include shape to prisma (creator + clubs)', async () => {
    const c = {
      ...makeCompetition({ id: 'c3' }),
      createdBy: { id: 'user-1', nickname: 'JuanP' },
      clubs: [],
    };
    (prisma.competition.findUnique as any).mockResolvedValue(c);

    await request(app).get('/api/competitions/c3');

    const call = (prisma.competition.findUnique as any).mock.calls[0][0];
    expect(call.where).toEqual({ id: 'c3' });
    expect(call.include.createdBy.select).toEqual({ id: true, nickname: true });
    expect(call.include.clubs).toBeDefined();
  });
});

// ─── GET /api/competitions (List) ──────────────────────────────────────────

describe('GET /api/competitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty list with hasMore=false, nextCursor=null', async () => {
    (prisma.competition.findMany as any).mockResolvedValue([]);

    const res = await request(app).get('/api/competitions');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toEqual({ nextCursor: null, hasMore: false });
  });

  it('returns 3 items with default limit', async () => {
    const items = [
      makeCompetition({ id: 'c1' }),
      makeCompetition({ id: 'c2' }),
      makeCompetition({ id: 'c3' }),
    ];
    (prisma.competition.findMany as any).mockResolvedValue(items);

    const res = await request(app).get('/api/competitions');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].id).toBe('c1');
    expect(res.body.pagination.hasMore).toBe(false);
    expect(res.body.pagination.nextCursor).toBeNull();
  });

  it('default limit is 20: take is limit+1=21', async () => {
    (prisma.competition.findMany as any).mockResolvedValue([]);

    await request(app).get('/api/competitions');

    const call = (prisma.competition.findMany as any).mock.calls[0][0];
    expect(call.take).toBe(21);
    expect(call.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
  });

  it('filters by type=LEAGUE', async () => {
    (prisma.competition.findMany as any).mockResolvedValue([
      makeCompetition({ id: 'c1', type: 'LEAGUE' }),
    ]);

    const res = await request(app).get('/api/competitions?type=LEAGUE');

    expect(res.status).toBe(200);
    const call = (prisma.competition.findMany as any).mock.calls[0][0];
    expect(call.where.type).toBe('LEAGUE');
  });

  it('combines filters: city + type + gameType', async () => {
    (prisma.competition.findMany as any).mockResolvedValue([]);

    await request(app).get('/api/competitions?city=Buenos%20Aires&type=LEAGUE&gameType=F7');

    const call = (prisma.competition.findMany as any).mock.calls[0][0];
    expect(call.where).toEqual({ city: 'Buenos Aires', type: 'LEAGUE', gameType: 'F7' });
  });

  it('rejects invalid enum type=FOO with 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/competitions?type=FOO');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('paginates: 21 mocked items + default limit → hasMore=true, nextCursor truthy', async () => {
    const items = Array.from({ length: 21 }, (_, i) =>
      makeCompetition({
        id: `c${String(i).padStart(2, '0')}`,
        createdAt: new Date(2026, 3, 28 - i, 12, 0, 0),
      }),
    );
    (prisma.competition.findMany as any).mockResolvedValue(items);

    const res = await request(app).get('/api/competitions');

    expect(res.body.data).toHaveLength(20);
    expect(res.body.pagination.hasMore).toBe(true);
    expect(typeof res.body.pagination.nextCursor).toBe('string');
    expect(res.body.pagination.nextCursor.length).toBeGreaterThan(0);
  });

  it('same-timestamp tie-break: returns C, B, A (ids desc)', async () => {
    const sameTime = new Date('2026-04-20T12:00:00.000Z');
    const items = [
      makeCompetition({ id: 'C', createdAt: sameTime }),
      makeCompetition({ id: 'B', createdAt: sameTime }),
      makeCompetition({ id: 'A', createdAt: sameTime }),
    ];
    (prisma.competition.findMany as any).mockResolvedValue(items);

    const res = await request(app).get('/api/competitions?limit=3');

    expect(res.body.data[0].id).toBe('C');
    expect(res.body.data[1].id).toBe('B');
    expect(res.body.data[2].id).toBe('A');
  });

  it('rejects limit=0 with 400', async () => {
    const res = await request(app).get('/api/competitions?limit=0');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects limit=-1 with 400', async () => {
    const res = await request(app).get('/api/competitions?limit=-1');
    expect(res.status).toBe(400);
  });

  it('rejects limit=101 with 400', async () => {
    const res = await request(app).get('/api/competitions?limit=101');
    expect(res.status).toBe(400);
  });

  it('rejects limit=abc with 400', async () => {
    const res = await request(app).get('/api/competitions?limit=abc');
    expect(res.status).toBe(400);
  });

  it('rejects malformed cursor with 400 INVALID_CURSOR', async () => {
    const res = await request(app).get('/api/competitions?cursor=not-a-valid-cursor');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });

  it('valid cursor passes cursor + skip to prisma', async () => {
    (prisma.competition.findMany as any).mockResolvedValue([]);
    // valid cursor: base64url of "2026-04-20T12:00:00.000Z__c1"
    const cursor = Buffer.from('2026-04-20T12:00:00.000Z__c1').toString('base64url');

    const res = await request(app).get(`/api/competitions?cursor=${cursor}`);

    expect(res.status).toBe(200);
    const call = (prisma.competition.findMany as any).mock.calls[0][0];
    expect(call.cursor).toEqual({ id: 'c1' });
    expect(call.skip).toBe(1);
  });

  it('response envelope keys are exactly success/data/pagination', async () => {
    (prisma.competition.findMany as any).mockResolvedValue([]);

    const res = await request(app).get('/api/competitions');

    expect(Object.keys(res.body).sort()).toEqual(['data', 'pagination', 'success']);
    expect(Object.keys(res.body.pagination).sort()).toEqual(['hasMore', 'nextCursor']);
  });
});

// ─── POST /api/competitions (Regression — schema-lift) ─────────────────────

describe('POST /api/competitions (regression after schema lift)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated request with 401', async () => {
    const res = await request(app).post('/api/competitions').send({
      name: 'Liga Test',
      type: 'LEAGUE',
      gameType: 'F7',
      startDate: '2026-05-01T18:00:00.000Z',
      latitude: -34.6,
      longitude: -58.4,
      city: 'Buenos Aires',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('source code: no inline z.object for create/register, imports from @matchday/shared', () => {
    const filePath = resolve(__dirname, '..', 'routes', 'competitions.ts');
    const src = readFileSync(filePath, 'utf8');

    // Must import lifted schemas from @matchday/shared
    expect(src).toMatch(/from\s+['"]@matchday\/shared['"]/);
    expect(src).toContain('createCompetitionSchema');
    expect(src).toContain('registerClubSchema');

    // Must NOT contain inline `z.object({` for the create body
    // (rough guard: no `z.object({` followed by `name: z.string()`)
    expect(src).not.toMatch(/z\.object\(\{\s*\n?\s*name:\s*z\.string\(\)/);
    // No inline `z.object({ clubId:`
    expect(src).not.toMatch(/z\.object\(\{\s*clubId:\s*z\.string/);
  });
});
