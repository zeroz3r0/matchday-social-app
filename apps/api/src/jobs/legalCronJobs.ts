// ============================================================================
// Legal cron jobs — hard-delete + export sweep (REQ-AD-6)
//
// `runHardDeleteTick`
//   Daily at 03:00 UTC. Selects users whose `deletedAt` is older than 30
//   days and feeds each one through `hardDeleteUser` (Serializable tx
//   anonymization — see services/accountDeletion.ts). Each user is wrapped
//   in its own try/catch so a single failure can't sink the batch.
//
// `runExportSweepTick`
//   Hourly. Marks any `DataExportRequest` past its `expiresAt` as EXPIRED
//   and deletes the on-disk ZIP if present. We DO sweep PENDING rows that
//   never finished — once their placeholder expiry passes, the user is
//   unblocked from the rate-limit window anyway.
// ============================================================================

import fs from 'node:fs';
import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../utils/prisma';
import { hardDeleteUser } from '../services/accountDeletion';
import { logger } from '../utils/logger';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const HARD_DELETE_BATCH = 200;

// Statuses that the sweep will flip to EXPIRED. We keep DOWNLOADED rows in
// place — they're already terminal and useful for audit.
const SWEEPABLE_STATUSES = ['PENDING', 'READY', 'FAILED'] as const;

export async function runHardDeleteTick(): Promise<void> {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);

  const candidates = await prisma.user.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true },
    take: HARD_DELETE_BATCH,
  });

  if (candidates.length === 0) return;

  logger.info({ count: candidates.length }, 'hard_delete_tick_started');

  for (const { id } of candidates) {
    try {
      await hardDeleteUser(id, prisma);
      logger.info({ userId: id }, 'hard_delete_user_anonymized');
    } catch (err) {
      // Per-user isolation: keep going so one bad row can't block the rest.
      logger.error({ err, userId: id }, 'hard_delete_user_failed');
    }
  }
}

export async function runExportSweepTick(): Promise<void> {
  const expired = await prisma.dataExportRequest.findMany({
    where: {
      expiresAt: { lt: new Date() },
      status: { in: [...SWEEPABLE_STATUSES] },
    },
  });

  if (expired.length === 0) return;

  logger.info({ count: expired.length }, 'export_sweep_started');

  for (const row of expired) {
    if (row.filePath) {
      try {
        await fs.promises.unlink(row.filePath);
      } catch (err) {
        // ENOENT is fine (file already gone); other errors get logged but
        // we still flip the row to EXPIRED so the sweep doesn't re-queue.
        logger.warn({ err, exportId: row.id, filePath: row.filePath }, 'export_zip_unlink_failed');
      }
    }

    try {
      await prisma.dataExportRequest.update({
        where: { id: row.id },
        data: { status: 'EXPIRED' },
      });
    } catch (err) {
      logger.error({ err, exportId: row.id }, 'export_sweep_status_update_failed');
    }
  }
}

// ─── Cron registration helpers ──────────────────────────────────────────────
//
// These return ScheduledTask handles so callers (scheduler.ts) can stop them
// in tests or graceful shutdown. node-cron@4 tasks do not auto-start, so the
// caller is responsible for invoking `.start()` explicitly (see scheduler.ts).

export function registerLegalCronJobs(): { hardDelete: ScheduledTask; exportSweep: ScheduledTask } {
  const hardDelete = cron.schedule('0 3 * * *', async () => {
    try {
      await runHardDeleteTick();
    } catch (err) {
      logger.error({ err }, 'hard_delete_tick_unhandled');
    }
  });

  const exportSweep = cron.schedule('0 * * * *', async () => {
    try {
      await runExportSweepTick();
    } catch (err) {
      logger.error({ err }, 'export_sweep_tick_unhandled');
    }
  });

  return { hardDelete, exportSweep };
}
