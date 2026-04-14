// ============================================================================
// Vote Routes — Player Rating + MVP Election
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { resolveMvp, MvpCandidate } from '@matchday/shared';

export const voteRoutes = Router();

// ─── Schema ─────────────────────────────────────────────────────────────────

const castVoteSchema = z.object({
  targetPlayerId: z.string(),
  rating: z.number().int().min(1).max(10),
  isMvpVote: z.boolean().default(false),
});

// ─── POST /api/votes/:matchId — Cast vote ──────────────────────────────────

voteRoutes.post('/:matchId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const voterId = req.user!.userId;
    const data = castVoteSchema.parse(req.body);

    // Check voting window still open
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new AppError(404, 'NOT_FOUND', 'Partido no encontrado');
    if (match.status !== 'COMPLETED') throw new AppError(400, 'MATCH_NOT_COMPLETED', 'Partido no finalizado');
    if (match.votingDeadline && new Date() > match.votingDeadline) {
      throw new AppError(400, 'VOTING_CLOSED', 'Ventana de votacion cerrada');
    }

    // Voter cant vote themselves
    if (voterId === data.targetPlayerId) {
      throw new AppError(400, 'SELF_VOTE', 'No puedes votarte a ti mismo');
    }

    // If MVP vote, check only 1 MVP vote per voter per match
    if (data.isMvpVote) {
      const existingMvp = await prisma.playerVote.findFirst({
        where: { matchId, voterId, isMvpVote: true },
      });
      if (existingMvp) {
        throw new AppError(400, 'MVP_ALREADY_VOTED', 'Ya votaste MVP en este partido');
      }
    }

    const vote = await prisma.playerVote.create({
      data: {
        matchId: matchId!,
        voterId,
        targetPlayerId: data.targetPlayerId,
        rating: data.rating,
        isMvpVote: data.isMvpVote,
      },
    });

    res.status(201).json({ success: true, data: vote });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/votes/:matchId/close — Close voting + calculate MVP ─────────

voteRoutes.post('/:matchId/close', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
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

    if (!match) throw new AppError(404, 'NOT_FOUND', 'Partido no encontrado');

    const homeTeam = match.teams.find((t) => t.isHome)!;
    const awayTeam = match.teams.find((t) => !t.isHome)!;
    const isHomeWinner = (match.homeScore ?? 0) > (match.awayScore ?? 0);
    const isAwayWinner = (match.awayScore ?? 0) > (match.homeScore ?? 0);

    // Get MVP votes
    const mvpVotes = await prisma.playerVote.groupBy({
      by: ['targetPlayerId'],
      where: { matchId, isMvpVote: true },
      _count: true,
    });

    // Get confirmed stats
    const stats = await prisma.matchStat.findMany({
      where: { matchId, validationStatus: { in: ['CONFIRMED', 'AUTO_CONFIRMED'] } },
    });

    // Build candidates
    const buildCandidates = (teamPlayers: { userId: string }[], isWinning: boolean, teamId: string): MvpCandidate[] =>
      teamPlayers.map((p) => {
        const playerStats = stats.find((s) => s.playerId === p.userId);
        const votes = mvpVotes.find((v) => v.targetPlayerId === p.userId);
        return {
          playerId: p.userId,
          teamId,
          mvpVotes: votes?._count ?? 0,
          goals: playerStats?.goals ?? 0,
          assists: playerStats?.assists ?? 0,
          isWinningTeam: isWinning,
        };
      });

    const homeCandidates = buildCandidates(homeTeam.players, isHomeWinner, homeTeam.id);
    const awayCandidates = buildCandidates(awayTeam.players, isAwayWinner, awayTeam.id);
    const allCandidates = [...homeCandidates, ...awayCandidates];

    // Resolve MVPs using shared algorithm
    const homeMvp = homeCandidates.length > 0 ? resolveMvp(homeCandidates) : null;
    const awayMvp = awayCandidates.length > 0 ? resolveMvp(awayCandidates) : null;
    const globalMvp = allCandidates.length > 0 ? resolveMvp(allCandidates) : null;

    if (!homeMvp || !awayMvp || !globalMvp) {
      throw new AppError(400, 'NO_CANDIDATES', 'No hay candidatos suficientes para MVP');
    }

    const mvpResult = await prisma.mvpResult.create({
      data: {
        matchId: matchId!,
        homeTeamMvpId: homeMvp.playerId,
        awayTeamMvpId: awayMvp.playerId,
        globalMvpId: globalMvp.playerId,
      },
    });

    res.json({
      success: true,
      data: mvpResult,
      message: 'Votacion cerrada. MVPs calculados.',
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/votes/:matchId — Get match votes summary ─────────────────────

voteRoutes.get('/:matchId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;

    const avgRatings = await prisma.playerVote.groupBy({
      by: ['targetPlayerId'],
      where: { matchId },
      _avg: { rating: true },
      _count: true,
    });

    const mvpResult = await prisma.mvpResult.findUnique({ where: { matchId } });

    res.json({
      success: true,
      data: {
        ratings: avgRatings.map((r) => ({
          playerId: r.targetPlayerId,
          avgRating: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : 0,
          totalVotes: r._count,
        })),
        mvp: mvpResult,
      },
    });
  } catch (error) {
    next(error);
  }
});
