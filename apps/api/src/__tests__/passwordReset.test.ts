// ============================================================================
// Password Reset — forgot/reset endpoints + email service
//
// Strict TDD coverage (RED first, GREEN after implementation):
//   AR-1   forgot-password vague success / nonexistent / malformed
//   AR-3   forgot-password rate limit (3/h/email)
//   AR-4   reset-password valid / expired / consumed / weak / unknown
//   AR-5   reset-password race (concurrent calls — exactly one wins)
//
// Prisma + bcrypt + email are mocked. Real DB is NOT touched.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('../services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'test-email-id' }),
}));

// Import AFTER vi.mock so the mocks bind first.
import app from '../app';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcrypt';
import { sendEmail } from '../services/email';

const mockUser = {
  id: 'user-lionel',
  email: 'lionel@example.com',
  password: '$2b$12$existingHash',
  nickname: 'Lionel',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── POST /api/auth/forgot-password ────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('AR-1 existing email → 200 vague + token row + email sent', async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$10$hashedTokenValue');
    (prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'tok-1',
      userId: mockUser.id,
      tokenHash: '$2b$10$hashedTokenValue',
      expiresAt: new Date(Date.now() + 3600_000),
      consumedAt: null,
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'lionel@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/Si tu email está registrado/);

    // Token row created with bcrypt-hashed token + ~1h expiry
    expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    const createArg = (prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mock
      .calls[0]![0] as { data: { userId: string; tokenHash: string; expiresAt: Date } };
    expect(createArg.data.userId).toBe(mockUser.id);
    expect(createArg.data.tokenHash).toBe('$2b$10$hashedTokenValue');
    const expiresMs = createArg.data.expiresAt.getTime();
    const nowMs = Date.now();
    // Allow 5s drift — should be ~1h ahead
    expect(expiresMs - nowMs).toBeGreaterThan(3590_000);
    expect(expiresMs - nowMs).toBeLessThan(3610_000);

    // Email sent with subject containing "Restablece"
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailArg = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(emailArg.to).toBe('lionel@example.com');
    expect(emailArg.subject).toMatch(/Restablece/);
    expect(emailArg.html).toContain('Hola Lionel');
  });

  it('AR-1 nonexistent email → 200 same message, no row, no email', async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'noone@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/Si tu email está registrado/);
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('AR-1 malformed email → 400 Zod', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('AR-3 rate limit — 4th call within 1h returns 429', async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$10$hashedTokenValue');
    (prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'tok',
      userId: mockUser.id,
      tokenHash: '$2b$10$hashedTokenValue',
      expiresAt: new Date(Date.now() + 3600_000),
      consumedAt: null,
      createdAt: new Date(),
    });

    // Use a unique email so prior describe blocks don't pollute the limiter.
    const email = `ratelimited-${Date.now()}@example.com`;

    // 3 allowed
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/auth/forgot-password').send({ email });
      expect(res.status).toBe(200);
    }

    // 4th throttled
    const res4 = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(res4.status).toBe(429);
  });
});

// ─── POST /api/auth/reset-password ─────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  const VALID_PLAINTEXT = 'a'.repeat(64);

  it('AR-4 valid token → 200, password updated, consumedAt set', async () => {
    const tokenRow = {
      id: 'tok-1',
      userId: mockUser.id,
      tokenHash: '$2b$10$validHash',
      expiresAt: new Date(Date.now() + 1800_000),
      consumedAt: null,
      createdAt: new Date(),
    };

    (prisma.passwordResetToken.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([tokenRow]);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.passwordResetToken.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 1,
    });
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$12$newPasswordHash');
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockUser,
      password: '$2b$12$newPasswordHash',
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: VALID_PLAINTEXT, newPassword: 'newpass123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // updateMany called with consumedAt:null guard
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledTimes(1);
    const updateArg = (prisma.passwordResetToken.updateMany as ReturnType<typeof vi.fn>).mock
      .calls[0]![0] as { where: { id: string; consumedAt: null }; data: { consumedAt: Date } };
    expect(updateArg.where.id).toBe('tok-1');
    expect(updateArg.where.consumedAt).toBeNull();
    expect(updateArg.data.consumedAt).toBeInstanceOf(Date);

    // User.password updated with bcrypt-hashed new password (cost 12)
    expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 12);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { password: '$2b$12$newPasswordHash' },
    });
  });

  it('AR-4 expired token → 400 generic', async () => {
    // Active query filters out expired (expiresAt < now), so findMany returns []
    (prisma.passwordResetToken.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: VALID_PLAINTEXT, newPassword: 'newpass123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
    expect(res.body.error.message).toMatch(/Token inválido o expirado/);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('AR-4 consumed token → 400 generic (idempotent)', async () => {
    // Active query filters consumedAt:null — already-consumed tokens not returned
    (prisma.passwordResetToken.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: VALID_PLAINTEXT, newPassword: 'newpass123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('AR-4 nonexistent token → 400 generic', async () => {
    (prisma.passwordResetToken.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: VALID_PLAINTEXT, newPassword: 'newpass123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('AR-4 weak password → 400 Zod', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: VALID_PLAINTEXT, newPassword: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(prisma.passwordResetToken.findMany).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('AR-5 race condition — two concurrent consumes, exactly one wins', async () => {
    const tokenRow = {
      id: 'tok-race',
      userId: mockUser.id,
      tokenHash: '$2b$10$raceHash',
      expiresAt: new Date(Date.now() + 1800_000),
      consumedAt: null,
      createdAt: new Date(),
    };

    (prisma.passwordResetToken.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([tokenRow]);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$12$newHash');
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    // First updateMany wins (count:1), second loses (count:0)
    let callIdx = 0;
    (prisma.passwordResetToken.updateMany as ReturnType<typeof vi.fn>).mockImplementation(
      async () => {
        callIdx += 1;
        return { count: callIdx === 1 ? 1 : 0 };
      },
    );

    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/auth/reset-password')
        .send({ token: VALID_PLAINTEXT, newPassword: 'newpass123' }),
      request(app)
        .post('/api/auth/reset-password')
        .send({ token: VALID_PLAINTEXT, newPassword: 'newpass123' }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 400]);

    const failing = res1.status === 400 ? res1 : res2;
    expect(failing.body.error.code).toBe('INVALID_TOKEN');
  });
});
