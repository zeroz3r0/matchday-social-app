// ============================================================================
// User Routes — Perfil, Medallas, Stats
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { sendEmail } from '../services/email';
import { Sentry } from '../lib/sentry';
import { userPublicProjection, type UserPublicShape } from '../utils/userPublicProjection';

export const userRoutes = Router();

// 30 days grace window for restoring a soft-deleted account (REQ-AD-3 / 6).
const GRACE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

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
        deletedAt: true,
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

    // REQ-AD-5: anonymize fields when soft-deleted; ID + position + createdAt
    // stay so match history / FK references keep working.
    const projected: UserPublicShape = userPublicProjection(user);
    res.json({
      success: true,
      data: {
        id: projected.id,
        nickname: projected.nickname,
        avatarUrl: projected.avatarUrl,
        position: user.position,
        bio: projected.bio,
        city: projected.city,
        createdAt: user.createdAt,
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

// ─── POST /api/users/me/delete (REQ-AD-1, REQ-AD-2) ─────────────────────────
//
// Soft-delete: mark `deletedAt = now()`. The hard-delete cron runs after the
// 30-day grace window (REQ-AD-6, Phase F). Idempotent — second call returns
// 204 without touching `deletedAt` or sending a second email.

userRoutes.post(
  '/me/delete',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, nickname: true, deletedAt: true },
      });
      if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado');
      }

      // REQ-AD-1: idempotent re-call.
      if (user.deletedAt) {
        res.status(204).send();
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });

      // REQ-AD-2: confirmation email is fire-and-forget — failures are
      // captured to Sentry but never block the soft-delete from succeeding.
      // Mobile UX shows the banner regardless of email delivery.
      const html =
        `<p>Hola ${user.nickname}, tu cuenta de matchday se eliminará en 30 días.</p>` +
        `<p>Si fue un error, iniciá sesión antes de ese plazo y restaurala desde el banner.</p>`;
      sendEmail({
        to: user.email,
        subject: 'Tu cuenta de matchday — eliminación programada',
        html,
      }).catch((err) => Sentry.captureException(err));

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

// ─── POST /api/users/me/delete/cancel (REQ-AD-3) ────────────────────────────
//
// Restore a soft-deleted account within the 30-day grace window. After the
// window the account is past the cron cutoff (or already anonymized) and
// cannot be restored — return 410 GRACE_PERIOD_EXPIRED.

userRoutes.post(
  '/me/delete/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, nickname: true, deletedAt: true },
      });
      if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado');
      }
      if (!user.deletedAt) {
        throw new AppError(400, 'NOT_DELETED', 'La cuenta no está eliminada');
      }

      const cutoff = new Date(Date.now() - GRACE_WINDOW_MS);
      if (user.deletedAt < cutoff) {
        throw new AppError(
          410,
          'GRACE_PERIOD_EXPIRED',
          'La ventana de 30 días para restaurar la cuenta ya expiró',
        );
      }

      await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: null },
      });

      const html = `<p>Hola ${user.nickname}, tu cuenta de matchday fue restaurada.</p>`;
      sendEmail({
        to: user.email,
        subject: 'Cuenta restaurada',
        html,
      }).catch((err) => Sentry.captureException(err));

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
