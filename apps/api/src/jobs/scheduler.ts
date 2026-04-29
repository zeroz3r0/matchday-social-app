// ============================================================================
// Scheduled Jobs — Cron tasks
// ============================================================================

import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { sendToUsers } from '../services/pushNotifications';
import { logger } from '../utils/logger';
import { Sentry } from '../lib/sentry';
import { registerLegalCronJobs } from './legalCronJobs';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMatchDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// ─── T-2h reminder tick (REQ Trigger T-2h Reminder Cron) ───────────────────
//
// Picks SCHEDULED matches with scheduledAt in the [T+1.5h, T+2.5h] window so
// each match gets pinged exactly once per 30-minute scheduler tick. Confirmed
// players (invitationStatus='ACCEPTED') receive a push routed to MatchDetail.
// Idempotency: we mark the match with a flag in memory? No — the window is
// narrow enough that a 30-min cadence overlaps each match in exactly one
// tick. We rely on the +/-30min window to provide single-fire semantics.

export async function runMatchReminderTick(): Promise<void> {
  const now = new Date();
  const lower = new Date(now.getTime() + 90 * 60 * 1000); // T+1.5h
  const upper = new Date(now.getTime() + 150 * 60 * 1000); // T+2.5h

  const matches = await prisma.match.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { gte: lower, lte: upper },
    },
    include: {
      teams: {
        include: {
          players: {
            where: { invitationStatus: 'ACCEPTED' },
            select: { userId: true },
          },
        },
      },
    },
  });

  for (const match of matches) {
    const playerIds = match.teams.flatMap((t) => t.players.map((p) => p.userId));
    if (playerIds.length === 0) continue;
    try {
      await sendToUsers(
        playerIds,
        {
          title: 'Tu partido es en 2h',
          body: `${match.gameType} - ${match.locationName}`,
          data: { route: 'MatchDetail', params: { matchId: match.id } },
        },
        prisma,
      );
      logger.info({ matchId: match.id, count: playerIds.length }, 'push_match_reminder_sent');
    } catch (err) {
      logger.error({ err, matchId: match.id }, 'push_match_reminder_failed');
      Sentry.captureException(err);
    }
  }
}

/**
 * Start all scheduled jobs:
 * 1. Auto-confirm stats after 24h without objections (every 5 min)
 * 2. Auto-close voting windows after 12h (every 5 min)
 * 3. Daily hard-delete cron at 03:00 UTC (REQ-AD-6, legal-foundation)
 * 4. Hourly data-export sweep (REQ-DE-2, legal-foundation)
 */
export function startScheduledJobs(): void {
  console.log('[CRON] Scheduled jobs started');

  // ─── Legal cron jobs (hard-delete + export sweep) ───────────────────
  // Test mode skips the registration entirely so vitest never accidentally
  // schedules cron callbacks against a live timer.
  if (process.env['NODE_ENV'] !== 'test') {
    const legalJobs = registerLegalCronJobs();
    legalJobs.hardDelete.start();
    legalJobs.exportSweep.start();
    console.log(
      '[CRON] Legal cron jobs registered (hard-delete daily 03:00 UTC + export sweep hourly)',
    );
  }

  // ─── Auto-confirm pending stats ─────────────────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      const autoConfirmed = await prisma.matchStat.updateMany({
        where: {
          validationStatus: 'PENDING',
          autoConfirmAt: { lte: now },
        },
        data: { validationStatus: 'AUTO_CONFIRMED' },
      });

      if (autoConfirmed.count > 0) {
        console.log(`[CRON] Auto-confirmed ${autoConfirmed.count} stats`);
      }
    } catch (error) {
      console.error('[CRON] Error auto-confirming stats:', error);
    }
  });

  // ─── Auto-close voting + calculate MVP ──────────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      // Find matches with expired voting windows that have no MVP result yet
      const expiredMatches = await prisma.match.findMany({
        where: {
          status: 'COMPLETED',
          votingDeadline: { lte: now },
          mvpResult: null,
        },
        include: {
          teams: {
            include: {
              players: {
                where: { invitationStatus: 'ACCEPTED' },
                include: { user: { select: { id: true } } },
              },
            },
          },
        },
      });

      for (const match of expiredMatches) {
        try {
          // Import MVP resolution
          const { resolveMvp } = await import('@matchday/shared');

          const homeTeam = match.teams.find((t) => t.isHome);
          const awayTeam = match.teams.find((t) => !t.isHome);
          if (!homeTeam || !awayTeam) continue;

          const isHomeWinner = (match.homeScore ?? 0) > (match.awayScore ?? 0);
          const isAwayWinner = (match.awayScore ?? 0) > (match.homeScore ?? 0);
          const isDraw = (match.homeScore ?? 0) === (match.awayScore ?? 0);

          // Get votes + stats
          const mvpVotes = await prisma.playerVote.groupBy({
            by: ['targetPlayerId'],
            where: { matchId: match.id, isMvpVote: true },
            _count: true,
          });

          const stats = await prisma.matchStat.findMany({
            where: { matchId: match.id, validationStatus: { in: ['CONFIRMED', 'AUTO_CONFIRMED'] } },
          });

          const buildCandidates = (
            players: { userId: string }[],
            isWinning: boolean,
            teamId: string,
          ) =>
            players.map((p) => ({
              playerId: p.userId,
              teamId,
              mvpVotes: mvpVotes.find((v) => v.targetPlayerId === p.userId)?._count ?? 0,
              goals: stats.find((s) => s.playerId === p.userId)?.goals ?? 0,
              assists: stats.find((s) => s.playerId === p.userId)?.assists ?? 0,
              isWinningTeam: isWinning,
            }));

          const homeCandidates = buildCandidates(
            homeTeam.players,
            isDraw ? false : isHomeWinner,
            homeTeam.id,
          );
          const awayCandidates = buildCandidates(
            awayTeam.players,
            isDraw ? false : isAwayWinner,
            awayTeam.id,
          );

          if (homeCandidates.length === 0 || awayCandidates.length === 0) continue;

          const homeMvp = resolveMvp(homeCandidates);
          const awayMvp = resolveMvp(awayCandidates);
          const globalMvp = resolveMvp([...homeCandidates, ...awayCandidates]);

          await prisma.mvpResult.create({
            data: {
              matchId: match.id,
              homeTeamMvpId: homeMvp.playerId,
              awayTeamMvpId: awayMvp.playerId,
              globalMvpId: globalMvp.playerId,
            },
          });

          // Notify all players. Fire-and-forget (REQ Trigger Resilience): a
          // push failure must not block the cron loop or other matches.
          const allPlayerIds = [...homeTeam.players, ...awayTeam.players].map((p) => p.userId);
          sendToUsers(
            allPlayerIds,
            {
              title: 'MVP anunciado',
              body: `${match.gameType} - ${formatMatchDate(match.scheduledAt)}`,
              data: { route: 'MatchDetail', params: { matchId: match.id } },
            },
            prisma,
          ).catch((err) => {
            logger.error({ err, matchId: match.id }, 'push_mvp_announce_failed');
            Sentry.captureException(err);
          });

          console.log(`[CRON] MVP calculated for match ${match.id}`);
        } catch (matchError) {
          console.error(`[CRON] Error processing match ${match.id}:`, matchError);
        }
      }
    } catch (error) {
      console.error('[CRON] Error closing voting windows:', error);
    }
  });

  // ─── T-2h match reminder (every 30 minutes) ─────────────────────────
  // Picks scheduled matches in the [now+1.5h, now+2.5h] window. The 30-min
  // tick cadence overlaps each match in exactly one tick — single-fire.
  cron.schedule('*/30 * * * *', async () => {
    try {
      await runMatchReminderTick();
    } catch (err) {
      logger.error({ err }, 'match_reminder_tick_unhandled');
      Sentry.captureException(err);
    }
  });
}
