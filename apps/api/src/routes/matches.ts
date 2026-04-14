// ============================================================================
// Match Routes — CRUD + Flow
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { sendMultiplePushNotifications } from '../utils/notifications';
import { VOTING_WINDOW_HOURS, STAT_AUTO_CONFIRM_HOURS } from '@matchday/shared';

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
    });

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
