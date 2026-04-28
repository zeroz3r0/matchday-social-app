import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';

describe('Health Check', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/health returns ok envelope when DB up', async () => {
    vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ '?column?': 1 }] as never);

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.uptime).toBe('number');
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.data.version).toBe('0.1.0');
    expect(res.body.data.checks.database).toBe('ok');
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('GET /api/health returns degraded when DB down', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.checks.database).toBe('fail');
  });

  it('GET /api/health returns degraded when DB query exceeds 100ms', async () => {
    vi.spyOn(prisma, '$queryRaw').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([{ '?column?': 1 }] as never), 250);
        }) as never,
    );

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.checks.database).toBe('fail');
  });

  it('GET /nonexistent returns 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
