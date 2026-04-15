// ============================================================================
// Match Routes — CRUD + Flow
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { sendMultiplePushNotifications } from '../utils/notifications';
import { VOTING_WINDOW_HOURS, STAT_AUTO_CONFIRM_HOURS, LEAGUE_POINTS } from '@matchday/shared';

export const matchRoutes = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const createMatchSchema = z.object({
  gameType: z.enum(['F5', 'F7', 'F11']),
  locationName: z.string().min(1).max(200),
  locationAddress: z.string().min(1).max(500),
  latitude: z.number(),
  longitude: z.number(),
  contactPhone: z.string().max(20).optional(),
  googlePlaceId: z.string().optional(),
  scheduledAt: z.string().datetime(),
  competitionId: z.string().optional(),
  homeTeam: z.object({
    name: z.string().min(1).max(60),
    clubId: z.string().optional(),
    playerIds: z.array(z.string()),
  }),
  awayTeam: z.object({
    name: z.string().min(1).max(60),
    clubId: z.string().optional(),
    playerIds: z.array(z.string()),
  }),
});

const submitStatsSchema = z.object({
  playerId: z.string(),
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
  yellowCards: z.number().int().min(0).max(2),
  redCards: z.number().int().min(0).max(1),
});

// ─── POST /api/matches — Create match ──────────────────────────────────────

matchRoutes.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createMatchSchema.parse(req.body);
    const userId = req.user!.userId;
    const scheduledAt = new Date(data.scheduledAt);
    const votingDeadline = new Date(scheduledAt.getTime() + VOTING_WINDOW_HOURS * 60 * 60 * 1000);

    const match = await prisma.match.create({
      data: {
        gameType: data.gameType,
        locationName: data.locationName,
        locationAddress: data.locationAddress,
        latitude: data.latitude,
        longitude: data.longitude,
        contactPhone: data.contactPhone,
        googlePlaceId: data.googlePlaceId,
        scheduledAt,
        votingDeadline,
        createdById: userId,
        competitionId: data.competitionId,
        teams: {
          create: [
            {
              name: data.homeTeam.name,
              isHome: true,
              clubId: data.homeTeam.clubId,
              players: {
                create: data.homeTeam.playerIds.map((pid) => ({
                  userId: pid,
                  position: 'MIDFIELDER', // Default, player updates later
                  invitationStatus: pid === userId ? 'ACCEPTED' : 'PENDING',
                })),
              },
            },
            {
              name: data.awayTeam.name,
              isHome: false,
              clubId: data.awayTeam.clubId,
              players: {
                create: data.awayTeam.playerIds.map((pid) => ({
                  userId: pid,
                  position: 'MIDFIELDER',
                  invitationStatus: pid === userId ? 'ACCEPTED' : 'PENDING',
                })),
              },
            },
          ],
        },
      },
      include: {
        teams: { include: { players: true } },
      },
    });

    // Send push notifications to invited players
    const allPlayerIds = [...data.homeTeam.playerIds, ...data.awayTeam.playerIds]
      .filter((pid) => pid !== userId);

    const users = await prisma.user.findMany({
      where: { id: { in: allPlayerIds }, fcmToken: { not: null } },
      select: { fcmToken: true },
    });

    const tokens = users.map((u) => u.fcmToken).filter(Boolean) as string[];
    await sendMultiplePushNotifications(tokens, {
      title: '⚽ Nueva convocatoria!',
      body: `Te han invitado a un partido ${data.gameType}`,
      data: { type: 'MATCH_INVITE', matchId: match.id },
    });

    res.status(201).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/matches/:id ──────────────────────────────────────────────────

matchRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params['id'] },
      include: {
        teams: {
          include: {
            players: {
              include: { user: { select: { id: true, nickname: true, avatarUrl: true, position: true } } },
            },
          },
        },
        mvpResult: true,
        stats: { where: { validationStatus: { in: ['CONFIRMED', 'AUTO_CONFIRMED'] } } },
      },
    });

    if (!match) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partido no encontrado' } });
      return;
    }

    res.json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/matches/:id/complete — Finish match + open voting ───────────

matchRoutes.post('/:id/complete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeScore, awayScore } = z.object({
      homeScore: z.number().int().min(0),
      awayScore: z.number().int().min(0),
    }).parse(req.body);

    const matchId = req.params['id']!;
    const now = new Date();

    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'COMPLETED',
        homeScore,
        awayScore,
        completedAt: now,
        votingDeadline: new Date(now.getTime() + VOTING_WINDOW_HOURS * 60 * 60 * 1000),
      },
      include: { teams: true },
    });

    // ─── Auto-update league standings if competition match ──────────────
    if (match.competitionId) {
      const competition = await prisma.competition.findUnique({ where: { id: match.competitionId } });

      if (competition?.type === 'LEAGUE') {
        const homeTeam = match.teams.find((t) => t.isHome);
        const awayTeam = match.teams.find((t) => !t.isHome);

        if (homeTeam?.clubId && awayTeam?.clubId) {
          const homeWin = homeScore > awayScore;
          const awayWin = awayScore > homeScore;
          const draw = homeScore === awayScore;

          await prisma.leagueStanding.update({
            where: { competitionId_clubId: { competitionId: match.competitionId, clubId: homeTeam.clubId } },
            data: {
              played: { increment: 1 },
              won: { increment: homeWin ? 1 : 0 },
              drawn: { increment: draw ? 1 : 0 },
              lost: { increment: awayWin ? 1 : 0 },
              goalsFor: { increment: homeScore },
              goalsAgainst: { increment: awayScore },
              points: { increment: homeWin ? LEAGUE_POINTS.WIN : draw ? LEAGUE_POINTS.DRAW : LEAGUE_POINTS.LOSS },
            },
          });

          await prisma.leagueStanding.update({
            where: { competitionId_clubId: { competitionId: match.competitionId, clubId: awayTeam.clubId } },
            data: {
              played: { increment: 1 },
              won: { increment: awayWin ? 1 : 0 },
              drawn: { increment: draw ? 1 : 0 },
              lost: { increment: homeWin ? 1 : 0 },
              goalsFor: { increment: awayScore },
              goalsAgainst: { increment: homeScore },
              points: { increment: awayWin ? LEAGUE_POINTS.WIN : draw ? LEAGUE_POINTS.DRAW : LEAGUE_POINTS.LOSS },
            },
          });
        }
      }

      // ─── Auto-advance tournament bracket ────────────────────────────────
      if (competition?.type === 'TOURNAMENT') {
        const winnerId = homeScore > awayScore
          ? match.teams.find((t) => t.isHome)?.clubId
          : match.teams.find((t) => !t.isHome)?.clubId;

        if (winnerId) {
          // Update current bracket with winner
          const bracket = await prisma.tournamentBracket.findFirst({
            where: { competitionId: match.competitionId, matchId },
          });

          if (bracket) {
            await prisma.tournamentBracket.update({
              where: { id: bracket.id },
              data: { winnerId },
            });

            // Advance winner to next round
            const stageOrder = ['ROUND_OF_64', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'];
            const currentIdx = stageOrder.indexOf(bracket.stage);
            const nextStage = stageOrder[currentIdx + 1];

            if (nextStage) {
              const nextMatchOrder = Math.ceil(bracket.matchOrder / 2);
              const isHome = bracket.matchOrder % 2 === 1;

              // Create or update next round bracket
              const existing = await prisma.tournamentBracket.findUnique({
                where: { competitionId_stage_matchOrder: { competitionId: match.competitionId, stage: nextStage as any, matchOrder: nextMatchOrder } },
              });

              if (existing) {
                await prisma.tournamentBracket.update({
                  where: { id: existing.id },
                  data: isHome ? { homeClubId: winnerId } : { awayClubId: winnerId },
                });
              } else {
                await prisma.tournamentBracket.create({
                  data: {
                    competitionId: match.competitionId,
                    stage: nextStage as any,
                    matchOrder: nextMatchOrder,
                    homeClubId: isHome ? winnerId : null,
                    awayClubId: isHome ? null : winnerId,
                  },
                });
              }
            }
          }
        }
      }
    }

    // Notify players voting window open
    const players = await prisma.matchPlayer.findMany({
      where: { matchTeam: { matchId } },
      include: { user: { select: { fcmToken: true } } },
    });

    const tokens = players.map((p) => p.user.fcmToken).filter(Boolean) as string[];
    await sendMultiplePushNotifications(tokens, {
      title: '🗳️ Vota a tu MVP!',
      body: `Partido finalizado ${homeScore}-${awayScore}. Tienes 12h para votar.`,
      data: { type: 'VOTE_REMINDER', matchId },
    });

    res.json({ success: true, data: match, message: 'Partido finalizado. Ventana de votacion abierta 12h.' });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/matches/:id/stats — Submit stats ───────────────────────────

matchRoutes.post('/:id/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = submitStatsSchema.parse(req.body);
    const matchId = req.params['id']!;
    const submittedById = req.user!.userId;

    // Count total players in match for confirmation threshold
    const totalPlayers = await prisma.matchPlayer.count({
      where: { matchTeam: { matchId }, invitationStatus: 'ACCEPTED' },
    });
    const requiredConfirmations = Math.ceil(totalPlayers * 0.5);
    const autoConfirmAt = new Date(Date.now() + STAT_AUTO_CONFIRM_HOURS * 60 * 60 * 1000);

    const stat = await prisma.matchStat.create({
      data: {
        matchId,
        playerId: data.playerId,
        goals: data.goals,
        assists: data.assists,
        yellowCards: data.yellowCards,
        redCards: data.redCards,
        submittedById,
        requiredConfirmations,
        autoConfirmAt,
      },
    });

    res.status(201).json({ success: true, data: stat });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/matches/:id/stats/:statId/confirm — Confirm/dispute stat ───

matchRoutes.post(
  '/:id/stats/:statId/confirm',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { confirmed } = z.object({ confirmed: z.boolean() }).parse(req.body);
      const { statId } = req.params;
      const userId = req.user!.userId;

      // Create confirmation
      await prisma.statConfirmation.create({
        data: { matchStatId: statId!, userId, confirmed },
      });

      if (confirmed) {
        // Increment counter, check threshold
        const stat = await prisma.matchStat.update({
          where: { id: statId },
          data: { confirmationsCount: { increment: 1 } },
        });

        if (stat.confirmationsCount >= stat.requiredConfirmations) {
          await prisma.matchStat.update({
            where: { id: statId },
            data: { validationStatus: 'CONFIRMED' },
          });
        }
      } else {
        await prisma.matchStat.update({
          where: { id: statId },
          data: { validationStatus: 'DISPUTED' },
        });
      }

      res.json({ success: true, message: confirmed ? 'Stat confirmada' : 'Stat disputada' });
    } catch (error) {
      next(error);
    }
  },
);

// ─── PATCH /api/matches/:id/invitation — Accept/decline invitation ─────────

matchRoutes.patch('/:id/invitation', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = z.object({
      status: z.enum(['ACCEPTED', 'DECLINED']),
    }).parse(req.body);

    const matchId = req.params['id']!;
    const userId = req.user!.userId;

    const player = await prisma.matchPlayer.findFirst({
      where: { userId, matchTeam: { matchId } },
    });

    if (!player) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No estas convocado a este partido' } });
      return;
    }

    const updated = await prisma.matchPlayer.update({
      where: { id: player.id },
      data: { invitationStatus: status },
    });

    res.json({ success: true, data: updated, message: `Invitacion ${status === 'ACCEPTED' ? 'aceptada' : 'rechazada'}` });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/matches — List my matches ────────────────────────────────────

matchRoutes.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { status, limit, offset } = z.object({
      status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']).optional(),
      limit: z.coerce.number().min(1).max(50).default(20),
      offset: z.coerce.number().min(0).default(0),
    }).parse(req.query);

    const where = {
      teams: { some: { players: { some: { userId } } } },
      ...(status ? { status } : {}),
    };

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          teams: {
            include: {
              players: {
                include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.match.count({ where }),
    ]);

    res.json({
      success: true,
      data: matches,
      pagination: { total, page: Math.floor(offset / limit) + 1, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/matches/nearby — Discover nearby matches ─────────────────────

matchRoutes.get('/nearby', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude, radius, limit } = z.object({
      latitude: z.coerce.number(),
      longitude: z.coerce.number(),
      radius: z.coerce.number().default(50), // km
      limit: z.coerce.number().min(1).max(50).default(20),
    }).parse(req.query);

    const matches = await prisma.$queryRawUnsafe<any[]>(
      `SELECT m.*, 
        (6371 * acos(cos(radians($1)) * cos(radians(m.latitude)) * cos(radians(m.longitude) - radians($2)) + sin(radians($1)) * sin(radians(m.latitude)))) AS distance
       FROM matches m
       WHERE m.status = 'SCHEDULED'
         AND m.scheduled_at > NOW()
         AND (6371 * acos(cos(radians($1)) * cos(radians(m.latitude)) * cos(radians(m.longitude) - radians($2)) + sin(radians($1)) * sin(radians(m.latitude)))) <= $3
       ORDER BY m.scheduled_at ASC
       LIMIT $4`,
      latitude, longitude, radius, limit,
    );

    res.json({ success: true, data: matches });
  } catch (error) {
    next(error);
  }
});
