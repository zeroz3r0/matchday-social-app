import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';

// Mock Prisma
vi.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
    compare: vi.fn(),
  },
}));

import { prisma } from '../utils/prisma';
import bcrypt from 'bcrypt';
import { LATEST_TOS_VERSION, LATEST_PRIVACY_VERSION } from '../services/legal';

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('creates user with valid data (incl. ToS + Privacy versions)', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        nickname: 'TestUser',
        position: 'FORWARD',
        avatarUrl: null,
        bio: null,
        city: null,
        createdAt: new Date(),
      };

      (prisma.user.create as any).mockResolvedValue(mockUser);

      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: 'password123',
        nickname: 'TestUser',
        position: 'FORWARD',
        acceptedTosVersion: LATEST_TOS_VERSION(),
        acceptedPrivacyVersion: LATEST_PRIVACY_VERSION(),
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.nickname).toBe('TestUser');
      expect(res.body.data.token).toBeDefined();
    });

    it('persists acceptance fields on user creation (D.1.1)', async () => {
      const mockUser = {
        id: 'user-2',
        email: 'a@b.com',
        nickname: 'Persist',
        position: 'FORWARD',
        avatarUrl: null,
        bio: null,
        city: null,
        createdAt: new Date(),
      };
      (prisma.user.create as any).mockResolvedValue(mockUser);

      await request(app).post('/api/auth/register').send({
        email: 'a@b.com',
        password: 'password123',
        nickname: 'Persist',
        position: 'FORWARD',
        acceptedTosVersion: LATEST_TOS_VERSION(),
        acceptedPrivacyVersion: LATEST_PRIVACY_VERSION(),
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      const callArg = (prisma.user.create as any).mock.calls[0][0];
      expect(callArg.data.acceptedTosVersion).toBe(LATEST_TOS_VERSION());
      expect(callArg.data.acceptedPrivacyVersion).toBe(LATEST_PRIVACY_VERSION());
      expect(callArg.data.acceptedAt).toBeInstanceOf(Date);
    });

    it('rejects missing acceptedTosVersion (D.1.2)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: 'password123',
        nickname: 'TestUser',
        position: 'FORWARD',
        acceptedPrivacyVersion: LATEST_PRIVACY_VERSION(),
        // acceptedTosVersion missing
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.acceptedTosVersion).toBeDefined();
    });

    it('rejects ToS version mismatch (D.1.3)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: 'password123',
        nickname: 'TestUser',
        position: 'FORWARD',
        acceptedTosVersion: 'v999',
        acceptedPrivacyVersion: LATEST_PRIVACY_VERSION(),
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOS_VERSION_MISMATCH');
      expect(res.body.error.data).toBeDefined();
      expect(res.body.error.data.currentVersion).toBe(LATEST_TOS_VERSION());
    });

    it('rejects Privacy version mismatch (D.1.4)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: 'password123',
        nickname: 'TestUser',
        position: 'FORWARD',
        acceptedTosVersion: LATEST_TOS_VERSION(),
        acceptedPrivacyVersion: 'v999',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PRIVACY_VERSION_MISMATCH');
      expect(res.body.error.data.currentVersion).toBe(LATEST_PRIVACY_VERSION());
    });

    it('rejects short password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: '123',
        nickname: 'TestUser',
        position: 'FORWARD',
        acceptedTosVersion: LATEST_TOS_VERSION(),
        acceptedPrivacyVersion: LATEST_PRIVACY_VERSION(),
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: 'password123',
        nickname: 'TestUser',
        position: 'FORWARD',
        acceptedTosVersion: LATEST_TOS_VERSION(),
        acceptedPrivacyVersion: LATEST_PRIVACY_VERSION(),
      });

      expect(res.status).toBe(400);
    });

    it('rejects invalid position', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: 'password123',
        nickname: 'TestUser',
        position: 'STRIKER', // Invalid
        acceptedTosVersion: LATEST_TOS_VERSION(),
        acceptedPrivacyVersion: LATEST_PRIVACY_VERSION(),
      });

      expect(res.status).toBe(400);
    });

    it('rejects nickname with spaces', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: 'password123',
        nickname: 'Test User',
        position: 'FORWARD',
        acceptedTosVersion: LATEST_TOS_VERSION(),
        acceptedPrivacyVersion: LATEST_PRIVACY_VERSION(),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns token with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        password: '$2b$12$hashedpassword',
        nickname: 'TestUser',
        position: 'FORWARD',
        avatarUrl: null,
        bio: null,
        city: null,
        deletedAt: null,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.nickname).toBe('TestUser');
    });

    it('rejects wrong password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        password: '$2b$12$hashedpassword',
        nickname: 'TestUser',
        position: 'FORWARD',
        deletedAt: null,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects nonexistent user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@test.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects empty body', async () => {
      const res = await request(app).post('/api/auth/login').send({});

      expect(res.status).toBe(400);
    });

    it('login of soft-deleted user returns meta.deleted (D.3.1)', async () => {
      const deletedAt = new Date('2026-04-20T12:00:00.000Z');
      const mockUser = {
        id: 'user-soft',
        email: 'soft@test.com',
        password: '$2b$12$hashedpassword',
        nickname: 'SoftDeleted',
        position: 'FORWARD',
        avatarUrl: null,
        bio: null,
        city: null,
        deletedAt,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'soft@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.deleted).toBe(true);
      expect(res.body.meta.deletedAt).toBe(deletedAt.toISOString());
    });

    it('login of normal (non-deleted) user has no meta.deleted (D.3.2)', async () => {
      const mockUser = {
        id: 'user-active',
        email: 'active@test.com',
        password: '$2b$12$hashedpassword',
        nickname: 'Active',
        position: 'FORWARD',
        avatarUrl: null,
        bio: null,
        city: null,
        deletedAt: null,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'active@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      // meta.deleted absent OR explicitly false — design says omit when not deleted
      expect(res.body.meta?.deleted).toBeFalsy();
    });
  });
});
