// ============================================================================
// Account Deletion Endpoints — POST /users/me/delete + /me/delete/cancel
//
// REQ-AD-1 soft-delete idempotent + 204
// REQ-AD-2 confirmation email on first delete
// REQ-AD-3 cancel within 30d window restores; 410 after window
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
  },
}));

vi.mock('../services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'test-email-id' }),
}));

import app from '../app';
import { prisma } from '../utils/prisma';
import { sendEmail } from '../services/email';
import { generateToken } from '../utils/jwt';

const userId = 'user-delete-1';
const userEmail = 'lionel@example.com';
const token = generateToken({ userId, email: userEmail, nickname: 'Lionel' });
const auth = `Bearer ${token}`;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── POST /api/users/me/delete (REQ-AD-1, REQ-AD-2) ────────────────────────

describe('POST /api/users/me/delete', () => {
  it('rejects without auth (401)', async () => {
    const res = await request(app).post('/api/users/me/delete');

    expect(res.status).toBe(401);
  });

  it('first delete sets deletedAt + returns 204 + sends email (D.2.1)', async () => {
    const mockUser = {
      id: userId,
      email: userEmail,
      nickname: 'Lionel',
      deletedAt: null,
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.user.update as any).mockResolvedValue({
      ...mockUser,
      deletedAt: new Date(),
    });

    const res = await request(app).post('/api/users/me/delete').set('Authorization', auth);

    expect(res.status).toBe(204);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const updateCall = (prisma.user.update as any).mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: userId });
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);

    // Email is fire-and-forget — it may have been called synchronously or
    // queued; assert the call itself happened with right destination + subject.
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailArg = (sendEmail as any).mock.calls[0][0];
    expect(emailArg.to).toBe(userEmail);
    expect(emailArg.subject).toMatch(/eliminación programada/i);
  });

  it('idempotent re-call leaves deletedAt unchanged (D.2.2)', async () => {
    const existingDeletedAt = new Date('2026-04-25T12:00:00.000Z');
    const mockUser = {
      id: userId,
      email: userEmail,
      nickname: 'Lionel',
      deletedAt: existingDeletedAt,
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const res = await request(app).post('/api/users/me/delete').set('Authorization', auth);

    expect(res.status).toBe(204);
    // No second deletedAt write — already deleted, idempotent.
    expect(prisma.user.update).not.toHaveBeenCalled();
    // No second email — only first delete sends.
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('returns 404 when user row missing', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const res = await request(app).post('/api/users/me/delete').set('Authorization', auth);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ─── POST /api/users/me/delete/cancel (REQ-AD-3) ───────────────────────────

describe('POST /api/users/me/delete/cancel', () => {
  it('rejects without auth (401)', async () => {
    const res = await request(app).post('/api/users/me/delete/cancel');

    expect(res.status).toBe(401);
  });

  it('cancel within 30d window clears deletedAt + returns 204 + restore email (D.2.3)', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const mockUser = {
      id: userId,
      email: userEmail,
      nickname: 'Lionel',
      deletedAt: fiveDaysAgo,
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.user.update as any).mockResolvedValue({ ...mockUser, deletedAt: null });

    const res = await request(app)
      .post('/api/users/me/delete/cancel')
      .set('Authorization', auth);

    expect(res.status).toBe(204);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const updateCall = (prisma.user.update as any).mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: userId });
    expect(updateCall.data.deletedAt).toBeNull();

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailArg = (sendEmail as any).mock.calls[0][0];
    expect(emailArg.to).toBe(userEmail);
    expect(emailArg.subject).toMatch(/restaurada/i);
  });

  it('cancel after 30d window returns 410 GRACE_PERIOD_EXPIRED (D.2.4)', async () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const mockUser = {
      id: userId,
      email: userEmail,
      nickname: 'Lionel',
      deletedAt: thirtyOneDaysAgo,
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/users/me/delete/cancel')
      .set('Authorization', auth);

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('GRACE_PERIOD_EXPIRED');
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('cancel when user is not deleted returns 400 NOT_DELETED (D.2.5)', async () => {
    const mockUser = {
      id: userId,
      email: userEmail,
      nickname: 'Lionel',
      deletedAt: null,
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/users/me/delete/cancel')
      .set('Authorization', auth);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NOT_DELETED');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
