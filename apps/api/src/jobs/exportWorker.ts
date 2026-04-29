// ============================================================================
// Export worker — gathers user data + writes a ZIP (REQ-DE-1)
//
// Called fire-and-forget from the `POST /users/me/export` route. The worker
// owns the full lifecycle for one DataExportRequest row:
//
//   1. Fetch profile + matches/stats/votes/competitions (last 12 months).
//   2. Build ZIP with 5 JSON entries via `archiver` (level-9 DEFLATE).
//   3. Persist `filePath` + `expiresAt` + `status = 'READY'` on the row.
//   4. Send the email with the HMAC signed download URL.
//
// Failures bubble up to the row as `status = 'FAILED'` and the email is
// skipped — Sentry captures the underlying error.
// ============================================================================

import archiver from 'archiver';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { Sentry } from '../lib/sentry';
import { sendEmail } from '../services/email';
import { signExportToken } from '../utils/exportToken';

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function getStorageDir(): string {
  const fromEnv = process.env['EXPORT_STORAGE_DIR'];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  // Default to a per-machine tmp dir so we never write into the repo by
  // accident. Production deployments override via env.
  return path.join(os.tmpdir(), 'matchday-exports');
}

function getPublicUrl(): string {
  const fromEnv = process.env['APP_PUBLIC_URL'];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return 'http://localhost:3000';
}

type ExportPrismaShape = Pick<
  PrismaClient,
  'user' | 'match' | 'matchStat' | 'playerVote' | 'competition' | 'dataExportRequest'
>;

type ExportRow = {
  id: string;
  userId: string;
};

export async function runExportWorker(
  exportRow: ExportRow,
  prisma: ExportPrismaShape,
): Promise<void> {
  const { id: exportId, userId } = exportRow;

  try {
    const sinceDate = new Date(Date.now() - TWELVE_MONTHS_MS);

    // Gather all the data shards in parallel — each is a thin Prisma query.
    const [profile, matches, stats, votes, competitions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          nickname: true,
          position: true,
          avatarUrl: true,
          bio: true,
          city: true,
          createdAt: true,
        },
      }),
      prisma.match.findMany({
        where: {
          createdAt: { gte: sinceDate },
          OR: [
            { createdById: userId },
            // Match → MatchTeam → MatchPlayer.userId (player participation).
            { teams: { some: { players: { some: { userId } } } } },
          ],
        },
      }),
      prisma.matchStat.findMany({
        where: { playerId: userId, createdAt: { gte: sinceDate } },
      }),
      prisma.playerVote.findMany({
        where: {
          createdAt: { gte: sinceDate },
          OR: [{ voterId: userId }, { targetPlayerId: userId }],
        },
      }),
      prisma.competition.findMany({
        where: { createdById: userId, createdAt: { gte: sinceDate } },
      }),
    ]);

    // Make sure the storage dir exists.
    const dir = getStorageDir();
    await fs.promises.mkdir(dir, { recursive: true });
    const zipPath = path.join(dir, `${exportId}.zip`);

    // Stream the archive to disk.
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      output.on('error', reject);
      archive.on('error', reject);
      archive.pipe(output);

      archive.append(JSON.stringify(profile, null, 2), { name: 'profile.json' });
      archive.append(JSON.stringify(matches, null, 2), { name: 'matches.json' });
      archive.append(JSON.stringify(votes, null, 2), { name: 'votes.json' });
      archive.append(JSON.stringify(stats, null, 2), { name: 'stats.json' });
      archive.append(JSON.stringify(competitions, null, 2), { name: 'competitions.json' });

      void archive.finalize();
    });

    const expiresAt = new Date(Date.now() + TWENTY_FOUR_HOURS_MS);

    await prisma.dataExportRequest.update({
      where: { id: exportId },
      data: {
        status: 'READY',
        filePath: zipPath,
        expiresAt,
      },
    });

    // Build signed link + send email.
    const tokenStr = signExportToken({
      userId,
      exportId,
      expiresAt: expiresAt.getTime(),
    });
    const downloadUrl = `${getPublicUrl()}/api/users/me/export/download/${tokenStr}`;

    if (profile?.email) {
      const html =
        `<p>Hola ${profile.nickname ?? ''}, tu export de datos está listo.</p>` +
        `<p>Descargalo acá: <a href="${downloadUrl}">${downloadUrl}</a></p>` +
        `<p>El link expira en 24 horas y es de un solo uso.</p>`;
      await sendEmail({
        to: profile.email,
        subject: 'Tus datos de matchday — descarga lista',
        html,
      }).catch((err: unknown) => {
        logger.error({ err, exportId }, 'export_email_failed');
        Sentry.captureException(err);
      });
    }
  } catch (err) {
    logger.error({ err, exportId, userId }, 'export_worker_failed');
    Sentry.captureException(err);

    // Best-effort flip the row to FAILED so the rate-limit window doesn't
    // permanently block the user on a bad attempt. The sweep cron later
    // marks expired rows EXPIRED regardless.
    try {
      await prisma.dataExportRequest.update({
        where: { id: exportId },
        data: { status: 'FAILED' },
      });
    } catch {
      // swallow — we already logged + captured the original error.
    }
  }
}
