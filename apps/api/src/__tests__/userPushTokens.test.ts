// ============================================================================
// User Push Token Endpoints — POST/DELETE /api/users/me/push-tokens
//
// Strict TDD coverage (RED first, GREEN after route impl):
//   B.1   POST happy → 200 + tokenId returned + row upserted
//   B.2   POST idempotent re-register → 200, no duplicate, lastUsedAt updated
//   B.3   POST malformed body (Zod) → 400 VALIDATION_ERROR
//   B.4   POST unauth → 401
//   B.5   DELETE happy → 204 + row removed
//   B.6   DELETE missing token → 204 (idempotent)
//
// Prisma is mocked. Real DB never touched.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../utils/prisma', () => ({
  prisma: {
    pushToken: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import app from '../app';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';

const userId = 'user-lionel';
const userEmail = 'lionel@example.com';
const token = generateToken({ userId, email: userEmail, nickname: 'Lionel' });
const auth = `Bearer ${token}`;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── POST /api/users/me/push-tokens ────────────────────────────────────────

describe('POST /api/users/me/push-tokens', () => {
  it('B.1 happy → 200 + tokenId + upsert row created', async () => {
    (prisma.pushToken.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pt-1',
      userId,
      token: 'ExponentPushToken[abc]',
      platform: 'ios',
      createdAt: new Date(),
      lastUsedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/users/me/push-tokens')
      .set('Authorization', auth)
      .send({ token: 'ExponentPushToken[abc]', platform: 'ios' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokenId).toBe('pt-1');

    expect(prisma.pushToken.upsert).toHaveBeenCalledTimes(1);
    const arg = (prisma.pushToken.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      where: { token: string };
      create: { userId: string; token: string; platform: string };
      update: { platform: string; lastUsedAt: Date };
    };
    expect(arg.where.token).toBe('ExponentPushToken[abc]');
    expect(arg.create.userId).toBe(userId);
    expect(arg.create.token).toBe('ExponentPushToken[abc]');
    expect(arg.create.platform).toBe('ios');
    expect(arg.update.platform).toBe('ios');
    expect(arg.update.lastUsedAt).toBeInstanceOf(Date);
  });

  it('B.2 idempotent re-register → 200, upsert called once with update branch', async () => {
    // Existing row simulated: same id returned, lastUsedAt bumped server-side.
    (prisma.pushToken.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pt-1',
      userId,
      token: 'ExponentPushToken[abc]',
      platform: 'ios',
      createdAt: new Date(Date.now() - 10_000),
      lastUsedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/users/me/push-tokens')
      .set('Authorization', auth)
      .send({ token: 'ExponentPushToken[abc]', platform: 'ios' });

    expect(res.status).toBe(200);
    expect(res.body.data.tokenId).toBe('pt-1');
    // Upsert is the right primitive — no separate find+update path.
    expect(prisma.pushToken.upsert).toHaveBeenCalledTimes(1);
  });

  it('B.3 malformed token (empty string) → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/users/me/push-tokens')
      .set('Authorization', auth)
      .send({ token: '', platform: 'ios' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(prisma.pushToken.upsert).not.toHaveBeenCalled();
  });

  it('B.3b invalid platform → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/users/me/push-tokens')
      .set('Authorization', auth)
      .send({ token: 'ExponentPushToken[abc]', platform: 'symbian' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(prisma.pushToken.upsert).not.toHaveBeenCalled();
  });

  it('B.4 unauth → 401', async () => {
    const res = await request(app)
      .post('/api/users/me/push-tokens')
      .send({ token: 'ExponentPushToken[abc]', platform: 'ios' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(prisma.pushToken.upsert).not.toHaveBeenCalled();
  });
});

// ─── DELETE /api/users/me/push-tokens/:token ───────────────────────────────

describe('DELETE /api/users/me/push-tokens/:token', () => {
  it('B.5 happy → 204 + row deleted (scoped to user)', async () => {
    (prisma.pushToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    const res = await request(app)
      .delete('/api/users/me/push-tokens/ExponentPushToken%5Babc%5D')
      .set('Authorization', auth);

    expect(res.status).toBe(204);
    expect(prisma.pushToken.deleteMany).toHaveBeenCalledTimes(1);
    const arg = (prisma.pushToken.deleteMany as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      where: { userId: string; token: string };
    };
    expect(arg.where.userId).toBe(userId);
    expect(arg.where.token).toBe('ExponentPushToken[abc]');
  });

  it('B.6 idempotent — token not found → 204', async () => {
    (prisma.pushToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const res = await request(app)
      .delete('/api/users/me/push-tokens/ghost-token')
      .set('Authorization', auth);

    expect(res.status).toBe(204);
    // Still hits prisma — server tries to delete and silently accepts 0 rows.
    expect(prisma.pushToken.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('DELETE unauth → 401', async () => {
    const res = await request(app).delete('/api/users/me/push-tokens/some-token');

    expect(res.status).toBe(401);
    expect(prisma.pushToken.deleteMany).not.toHaveBeenCalled();
  });
});
