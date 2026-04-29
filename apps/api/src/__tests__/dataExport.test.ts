// ============================================================================
// Data Export — POST /users/me/export + GET /users/me/export/download/:token
//
// REQ-DE-1 async export endpoint, ZIP contains profile/matches/votes/stats/competitions
// REQ-DE-2 email with HMAC signed link, 24h expiry, single-use
// REQ-DE-3 rate limit 1/24h
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    dataExportRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    match: {
      findMany: vi.fn(),
    },
    matchStat: {
      findMany: vi.fn(),
    },
    playerVote: {
      findMany: vi.fn(),
    },
    competition: {
      findMany: vi.fn(),
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
import { signExportToken, verifyExportToken } from '../utils/exportToken';

const userId = 'user-export-1';
const userEmail = 'mariana@example.com';
const token = generateToken({ userId, email: userEmail, nickname: 'Mariana' });
const auth = `Bearer ${token}`;

// Use OS temp dir for the test export storage so we never touch repo files.
const exportDir = path.join(os.tmpdir(), 'matchday-export-tests');
process.env['EXPORT_STORAGE_DIR'] = exportDir;
process.env['EXPORT_SIGNING_SECRET'] = 'test-export-secret-deterministic';
process.env['APP_PUBLIC_URL'] = 'https://api.matchday.test';

beforeEach(() => {
  vi.clearAllMocks();
  // Clean up any stale test ZIPs.
  if (fs.existsSync(exportDir)) {
    for (const f of fs.readdirSync(exportDir)) {
      try {
        fs.unlinkSync(path.join(exportDir, f));
      } catch {
        /* ignore */
      }
    }
  }
});

// ─── POST /api/users/me/export (REQ-DE-1, REQ-DE-2, REQ-DE-3) ──────────────

describe('POST /api/users/me/export', () => {
  it('rejects without auth (401)', async () => {
    const res = await request(app).post('/api/users/me/export');
    expect(res.status).toBe(401);
  });

  it('first call returns 202 + creates DataExportRequest + sends email (E.1.1)', async () => {
    // No previous request → not rate-limited.
    (prisma.dataExportRequest.findFirst as any).mockResolvedValue(null);
    (prisma.dataExportRequest.create as any).mockResolvedValue({
      id: 'export-req-1',
      userId,
      status: 'PENDING',
      filePath: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    (prisma.dataExportRequest.update as any).mockResolvedValue({
      id: 'export-req-1',
      status: 'READY',
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      email: userEmail,
      nickname: 'Mariana',
    });
    (prisma.match.findMany as any).mockResolvedValue([]);
    (prisma.matchStat.findMany as any).mockResolvedValue([]);
    (prisma.playerVote.findMany as any).mockResolvedValue([]);
    (prisma.competition.findMany as any).mockResolvedValue([]);

    const res = await request(app).post('/api/users/me/export').set('Authorization', auth);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.exportId).toBe('export-req-1');

    expect(prisma.dataExportRequest.create).toHaveBeenCalledTimes(1);
    const createArg = (prisma.dataExportRequest.create as any).mock.calls[0][0];
    expect(createArg.data.userId).toBe(userId);
    expect(createArg.data.status).toBe('PENDING');

    // Wait for the fire-and-forget worker to write the ZIP + invoke email.
    // The worker is async (Promise.all + archiver finalize + fs writes) so
    // give it enough headroom to complete on slow CI runners.
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailArg = (sendEmail as any).mock.calls[0][0];
    expect(emailArg.to).toBe(userEmail);
    expect(emailArg.subject).toMatch(/datos/i);
    // The signed download URL must be in the body.
    expect(emailArg.html).toMatch(/\/api\/users\/me\/export\/download\//);
  });

  it('second call within 24h is rate-limited (429 EXPORT_RATE_LIMIT) (E.1.2)', async () => {
    // Existing recent request blocks the second.
    (prisma.dataExportRequest.findFirst as any).mockResolvedValue({
      id: 'export-req-prev',
      userId,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
      status: 'READY',
    });

    const res = await request(app).post('/api/users/me/export').set('Authorization', auth);

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('EXPORT_RATE_LIMIT');
    expect(prisma.dataExportRequest.create).not.toHaveBeenCalled();
  });

  it('produces a ZIP file containing the 5 expected JSON entries (E.1.3)', async () => {
    (prisma.dataExportRequest.findFirst as any).mockResolvedValue(null);
    let createdRow: any = null;
    (prisma.dataExportRequest.create as any).mockImplementation((args: any) => {
      createdRow = {
        id: 'export-req-zip',
        userId: args.data.userId,
        status: args.data.status,
        filePath: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      return Promise.resolve(createdRow);
    });
    let lastUpdate: any = null;
    (prisma.dataExportRequest.update as any).mockImplementation((args: any) => {
      lastUpdate = args.data;
      return Promise.resolve({ ...createdRow, ...args.data });
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      email: userEmail,
      nickname: 'Mariana',
    });
    (prisma.match.findMany as any).mockResolvedValue([{ id: 'm1' }]);
    (prisma.matchStat.findMany as any).mockResolvedValue([{ id: 's1', goals: 1 }]);
    (prisma.playerVote.findMany as any).mockResolvedValue([{ id: 'v1' }]);
    (prisma.competition.findMany as any).mockResolvedValue([{ id: 'c1' }]);

    const res = await request(app).post('/api/users/me/export').set('Authorization', auth);
    expect(res.status).toBe(202);

    // Wait for the worker to finish — it writes the ZIP + flips status to READY.
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(lastUpdate).toBeTruthy();
    expect(lastUpdate.status).toBe('READY');
    expect(typeof lastUpdate.filePath).toBe('string');

    const zipPath = lastUpdate.filePath as string;
    expect(fs.existsSync(zipPath)).toBe(true);

    // Inspect the ZIP via a tiny inline reader (no extra dep — read central
    // directory headers). Simpler: use `archiver`'s sibling reader if present,
    // OR shell out to PowerShell's Expand-Archive… but we'll just check that
    // the file is non-trivially sized (a real ZIP with 5 JSON entries is
    // always > 200 bytes) AND parse its central directory entries by
    // searching for the entry filenames as raw bytes.
    const zipBuffer = fs.readFileSync(zipPath);
    expect(zipBuffer.length).toBeGreaterThan(200);

    const zipStr = zipBuffer.toString('binary');
    expect(zipStr).toContain('profile.json');
    expect(zipStr).toContain('matches.json');
    expect(zipStr).toContain('votes.json');
    expect(zipStr).toContain('stats.json');
    expect(zipStr).toContain('competitions.json');
  });
});

// ─── GET /api/users/me/export/download/:token ──────────────────────────────

describe('GET /api/users/me/export/download/:token', () => {
  it('valid token + READY request returns ZIP (200) (E.1.5)', async () => {
    // Pre-create a tiny "ZIP" file on disk so the route can stream it.
    fs.mkdirSync(exportDir, { recursive: true });
    const zipPath = path.join(exportDir, 'export-req-good.zip');
    fs.writeFileSync(zipPath, 'PK\u0003\u0004fake-zip-bytes');

    (prisma.dataExportRequest.findUnique as any).mockResolvedValue({
      id: 'export-req-good',
      userId,
      status: 'READY',
      filePath: zipPath,
      downloadedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    });
    (prisma.dataExportRequest.update as any).mockResolvedValue({
      id: 'export-req-good',
      status: 'DOWNLOADED',
      downloadedAt: new Date(),
    });

    const tok = signExportToken({
      userId,
      exportId: 'export-req-good',
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    const res = await request(app).get(`/api/users/me/export/download/${tok}`);

    expect(res.status).toBe(200);
    // Single-use → must mark downloadedAt.
    expect(prisma.dataExportRequest.update).toHaveBeenCalledTimes(1);
    const updateArg = (prisma.dataExportRequest.update as any).mock.calls[0][0];
    expect(updateArg.data.downloadedAt).toBeInstanceOf(Date);
  });

  it('invalid HMAC token returns 404 (E.1.6)', async () => {
    // Tampered signature.
    const goodToken = signExportToken({
      userId,
      exportId: 'export-x',
      expiresAt: Date.now() + 60 * 1000,
    });
    const tampered = goodToken.slice(0, -3) + 'xxx';

    const res = await request(app).get(`/api/users/me/export/download/${tampered}`);

    expect(res.status).toBe(404);
    expect(prisma.dataExportRequest.findUnique).not.toHaveBeenCalled();
  });

  it('expired token returns 410 LINK_EXPIRED (E.1.7)', async () => {
    const expiredTok = signExportToken({
      userId,
      exportId: 'export-x',
      expiresAt: Date.now() - 60 * 1000, // already expired
    });

    const res = await request(app).get(`/api/users/me/export/download/${expiredTok}`);

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('LINK_EXPIRED');
  });

  it('already-downloaded request returns 410 LINK_EXPIRED (E.1.8)', async () => {
    (prisma.dataExportRequest.findUnique as any).mockResolvedValue({
      id: 'export-req-used',
      userId,
      status: 'DOWNLOADED',
      filePath: '/tmp/whatever.zip',
      downloadedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    });

    const tok = signExportToken({
      userId,
      exportId: 'export-req-used',
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    const res = await request(app).get(`/api/users/me/export/download/${tok}`);

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('LINK_EXPIRED');
  });
});

// ─── Token signing/verification (REQ-DE-2 — HMAC unit) ─────────────────────

describe('exportToken (HMAC sign/verify)', () => {
  it('round-trips a valid payload', () => {
    const expiresAt = Date.now() + 60_000;
    const tok = signExportToken({ userId: 'u1', exportId: 'e1', expiresAt });
    const verified = verifyExportToken(tok);
    expect(verified.valid).toBe(true);
    if (verified.valid) {
      expect(verified.payload.userId).toBe('u1');
      expect(verified.payload.exportId).toBe('e1');
      expect(verified.payload.expiresAt).toBe(expiresAt);
    }
  });

  it('detects tampered signature', () => {
    const tok = signExportToken({
      userId: 'u1',
      exportId: 'e1',
      expiresAt: Date.now() + 60_000,
    });
    const tampered = tok.slice(0, -2) + (tok.endsWith('a') ? 'b' : 'a') + 'b';
    const verified = verifyExportToken(tampered);
    expect(verified.valid).toBe(false);
    if (!verified.valid) {
      expect(verified.reason).toMatch(/signature|malformed/);
    }
  });

  it('detects expired payload', () => {
    const tok = signExportToken({
      userId: 'u1',
      exportId: 'e1',
      expiresAt: Date.now() - 1000,
    });
    const verified = verifyExportToken(tok);
    expect(verified.valid).toBe(false);
    if (!verified.valid) {
      expect(verified.reason).toBe('expired');
    }
  });
});
