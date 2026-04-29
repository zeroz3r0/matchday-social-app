// ============================================================================
// Scheduled Jobs — Cron tasks
// ============================================================================

import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { sendMultiplePushNotifications } from '../utils/notifications';
import { registerLegalCronJobs } from './legalCronJobs';

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

          // Notify all players (Phase D will swap to pushNotifications.sendToUsers).
          const allPlayerIds = [...homeTeam.players, ...awayTeam.players].map((p) => p.userId);
          const pushTokenRows = await prisma.pushToken.findMany({
            where: { userId: { in: allPlayerIds } },
            select: { token: true },
          });
          const tokens = pushTokenRows.map((r) => r.token);

          await sendMultiplePushNotifications(tokens, {
            title: '🏆 MVP anunciado!',
            body: 'Los resultados de votacion ya estan disponibles.',
            data: { type: 'MVP_RESULT', matchId: match.id },
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
}
