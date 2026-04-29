// ============================================================================
// Legal cron jobs — runHardDeleteTick + runExportSweepTick (REQ-AD-6)
//
// We test the LOGIC each cron tick executes — not the cron timing itself.
// Cron registration is a side-effect; the ticks are pure async functions
// that take prisma + return void.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    dataExportRequest: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// hardDeleteUser is exercised separately in anonymization.test.ts — here we
// just verify the cron CALLS it for each candidate row.
vi.mock('../services/accountDeletion', () => ({
  hardDeleteUser: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../utils/prisma';
import { hardDeleteUser } from '../services/accountDeletion';
import { runHardDeleteTick, runExportSweepTick } from '../jobs/legalCronJobs';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── runHardDeleteTick (REQ-AD-6) ──────────────────────────────────────────

describe('runHardDeleteTick', () => {
  it('queries users with deletedAt older than 30 days (F.1)', async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);

    await runHardDeleteTick();

    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    const arg = (prisma.user.findMany as any).mock.calls[0][0];
    expect(arg.where.deletedAt).toBeDefined();
    expect(arg.where.deletedAt.lt).toBeInstanceOf(Date);

    // Cutoff must be ~30d ago (allow ±1s window for test execution latency).
    const cutoff = arg.where.deletedAt.lt as Date;
    const expected = Date.now() - 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(2000);

    // Batch-cap to avoid runaway processing.
    expect(arg.take).toBe(200);
  });

  it('invokes hardDeleteUser for each candidate row', async () => {
    (prisma.user.findMany as any).mockResolvedValue([{ id: 'user-old-1' }, { id: 'user-old-2' }]);

    await runHardDeleteTick();

    expect(hardDeleteUser).toHaveBeenCalledTimes(2);
    expect((hardDeleteUser as any).mock.calls[0][0]).toBe('user-old-1');
    expect((hardDeleteUser as any).mock.calls[1][0]).toBe('user-old-2');
  });

  it('continues processing when one user fails (per-user try/catch)', async () => {
    (prisma.user.findMany as any).mockResolvedValue([{ id: 'user-bad' }, { id: 'user-good' }]);
    (hardDeleteUser as any)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

    await expect(runHardDeleteTick()).resolves.toBeUndefined();
    expect(hardDeleteUser).toHaveBeenCalledTimes(2);
  });

  it('does nothing when no candidates match', async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);

    await runHardDeleteTick();

    expect(hardDeleteUser).not.toHaveBeenCalled();
  });
});

// ─── runExportSweepTick — clean expired ZIPs ───────────────────────────────

describe('runExportSweepTick', () => {
  it('marks expired DataExportRequests as EXPIRED + deletes ZIP file', async () => {
    // Prepare a real temp ZIP file on disk so we can verify it gets deleted.
    const tmpDir = path.join(os.tmpdir(), 'matchday-sweep-test');
    fs.mkdirSync(tmpDir, { recursive: true });
    const zipPath = path.join(tmpDir, `expired-${Date.now()}.zip`);
    fs.writeFileSync(zipPath, 'PK\u0003\u0004stale');
    expect(fs.existsSync(zipPath)).toBe(true);

    (prisma.dataExportRequest.findMany as any).mockResolvedValue([
      {
        id: 'export-stale-1',
        userId: 'u1',
        status: 'READY',
        filePath: zipPath,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    ]);
    (prisma.dataExportRequest.update as any).mockResolvedValue({});

    await runExportSweepTick();

    expect(prisma.dataExportRequest.update).toHaveBeenCalledTimes(1);
    const arg = (prisma.dataExportRequest.update as any).mock.calls[0][0];
    expect(arg.where.id).toBe('export-stale-1');
    expect(arg.data.status).toBe('EXPIRED');

    // ZIP file removed from disk.
    expect(fs.existsSync(zipPath)).toBe(false);
  });

  it('skips rows with no filePath (failed-before-write case)', async () => {
    (prisma.dataExportRequest.findMany as any).mockResolvedValue([
      {
        id: 'export-stale-empty',
        userId: 'u1',
        status: 'PENDING',
        filePath: null,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    ]);
    (prisma.dataExportRequest.update as any).mockResolvedValue({});

    await expect(runExportSweepTick()).resolves.toBeUndefined();
    // Row is still marked EXPIRED so we don't keep selecting it.
    expect(prisma.dataExportRequest.update).toHaveBeenCalledTimes(1);
    expect((prisma.dataExportRequest.update as any).mock.calls[0][0].data.status).toBe('EXPIRED');
  });

  it('queries only non-EXPIRED rows past their expiresAt', async () => {
    (prisma.dataExportRequest.findMany as any).mockResolvedValue([]);

    await runExportSweepTick();

    expect(prisma.dataExportRequest.findMany).toHaveBeenCalledTimes(1);
    const arg = (prisma.dataExportRequest.findMany as any).mock.calls[0][0];
    expect(arg.where.expiresAt.lt).toBeInstanceOf(Date);
    expect(arg.where.status).toBeDefined();
  });
});
