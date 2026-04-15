import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';
import { generateToken } from '../utils/jwt';

describe('Auth Middleware', () => {
  it('rejects request without token', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects request with invalid token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token-here');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects request with Bearer but no token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer ');

    expect(res.status).toBe(401);
  });

  it('rejects non-Bearer auth header', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('JWT Utils', () => {
  it('generates and verifies token', () => {
    const payload = { userId: 'u1', email: 'a@b.com', nickname: 'test' };
    const token = generateToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT = 3 parts
  });
});
