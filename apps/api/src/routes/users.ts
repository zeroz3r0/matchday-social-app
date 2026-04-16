// ============================================================================
// User Routes — Perfil, Medallas, Stats
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

export const userRoutes = Router();

// ─── GET /api/users/me — Mi perfil ─────────────────────────────────────────

userRoutes.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        position: true,
        bio: true,
        latitude: true,
        longitude: true,
        city: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
      });
      return;
    }

    // Aggregate medals from confirmed stats
    const medals = await prisma.matchStat.aggregate({
      where: {
        playerId: userId,
        validationStatus: { in: ['CONFIRMED', 'AUTO_CONFIRMED'] },
      },
      _sum: {
        goals: true,
        assists: true,
        yellowCards: true,
        redCards: true,
      },
      _count: true,
    });

    // Count MVP awards
    const mvpCount = await prisma.mvpResult.count({
      where: {
        OR: [{ homeTeamMvpId: userId }, { awayTeamMvpId: userId }, { globalMvpId: userId }],
      },
    });

    // Average rating received (rounded to 1 decimal)
    const avgRating = await prisma.playerVote.aggregate({
      where: { targetPlayerId: userId },
      _avg: { rating: true },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        ...user,
        medals: {
          mvpCount,
          totalGoals: medals._sum.goals || 0,
          totalAssists: medals._sum.assists || 0,
          totalYellowCards: medals._sum.yellowCards || 0,
          totalRedCards: medals._sum.redCards || 0,
          matchesPlayed: medals._count,
        },
        stats: {
          avgRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 10) / 10 : 0,
          totalVotesReceived: avgRating._count,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/users/:id — Perfil publico ────────────────────────────────────

userRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        position: true,
        bio: true,
        city: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
      });
      return;
    }

    const medals = await prisma.matchStat.aggregate({
      where: {
        playerId: id,
        validationStatus: { in: ['CONFIRMED', 'AUTO_CONFIRMED'] },
      },
      _sum: { goals: true, assists: true, yellowCards: true, redCards: true },
      _count: true,
    });

    const mvpCount = await prisma.mvpResult.count({
      where: {
        OR: [{ homeTeamMvpId: id }, { awayTeamMvpId: id }, { globalMvpId: id }],
      },
    });

    const avgRating = await prisma.playerVote.aggregate({
      where: { targetPlayerId: id },
      _avg: { rating: true },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        ...user,
        medals: {
          mvpCount,
          totalGoals: medals._sum.goals || 0,
          totalAssists: medals._sum.assists || 0,
          totalYellowCards: medals._sum.yellowCards || 0,
          totalRedCards: medals._sum.redCards || 0,
          matchesPlayed: medals._count,
        },
        stats: {
          avgRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 10) / 10 : 0,
          totalVotesReceived: avgRating._count,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/users/me — Actualizar perfil ───────────────────────────────

const updateProfileSchema = z.object({
  nickname: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_.-]+$/)
    .optional(),
  avatarUrl: z.string().url().optional(),
  position: z.enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD']).optional(),
  bio: z.string().max(280).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().max(100).optional(),
  fcmToken: z.string().optional(),
});

userRoutes.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const userId = req.user!.userId;

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        position: true,
        bio: true,
        city: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Perfil actualizado',
    });
  } catch (error) {
    next(error);
  }
});
