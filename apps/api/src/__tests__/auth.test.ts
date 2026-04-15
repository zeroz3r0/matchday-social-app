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

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('creates user with valid data', async () => {
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

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'password123',
          nickname: 'TestUser',
          position: 'FORWARD',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.nickname).toBe('TestUser');
      expect(res.body.data.token).toBeDefined();
    });

    it('rejects short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: '123',
          nickname: 'TestUser',
          position: 'FORWARD',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          nickname: 'TestUser',
          position: 'FORWARD',
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid position', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'password123',
          nickname: 'TestUser',
          position: 'STRIKER', // Invalid
        });

      expect(res.status).toBe(400);
    });

    it('rejects nickname with spaces', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'password123',
          nickname: 'Test User',
          position: 'FORWARD',
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
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
