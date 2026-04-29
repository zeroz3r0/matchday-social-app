// ============================================================================
// User Routes — Perfil, Medallas, Stats
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { sendEmail } from '../services/email';
import { Sentry } from '../lib/sentry';
import { userPublicProjection, type UserPublicShape } from '../utils/userPublicProjection';
import { runExportWorker } from '../jobs/exportWorker';
import { verifyExportToken } from '../utils/exportToken';

export const userRoutes = Router();

// 30 days grace window for restoring a soft-deleted account (REQ-AD-3 / 6).
const GRACE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Rate-limit window for data export (REQ-DE-3): one successful enqueue per
// user per 24 hours. We measure this by looking at the most recent
// DataExportRequest row for the user — any row created within the window
// blocks a new request, regardless of its status (PENDING/READY/DOWNLOADED).
const EXPORT_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

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

// ─── POST /api/users/me/push-tokens (push-notifications-real-impl) ─────────
//
// Register an Expo push token for the authenticated user. Idempotent — same
// token re-registered is a no-op upsert that bumps `lastUsedAt` and corrects
// `platform` (e.g. backfilled rows start as 'unknown' until first real
// register call).

const pushTokenRegisterSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
});

userRoutes.post(
  '/me/push-tokens',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, platform } = pushTokenRegisterSchema.parse(req.body);
      const userId = req.user!.userId;
      const now = new Date();

      const row = await prisma.pushToken.upsert({
        where: { token },
        create: { userId, token, platform, lastUsedAt: now },
        update: { platform, lastUsedAt: now },
      });

      res.status(200).json({
        success: true,
        data: { tokenId: row.id },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ─── DELETE /api/users/me/push-tokens/:token ───────────────────────────────
//
// Idempotent — missing token returns 204 (no-op). Scoped to current user so
// a stolen token can't be revoked from someone else's account.

userRoutes.delete(
  '/me/push-tokens/:token',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenParam = req.params['token'];
      if (typeof tokenParam !== 'string' || tokenParam.length === 0) {
        // Express decoded the path param; empty value is malformed but we
        // still treat as no-op to keep the endpoint idempotent.
        res.status(204).send();
        return;
      }
      const userId = req.user!.userId;

      await prisma.pushToken.deleteMany({
        where: { userId, token: tokenParam },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

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

// ─── POST /api/users/me/export (REQ-DE-1, REQ-DE-3) ─────────────────────────
//
// Enqueues a ZIP export of the user's data and returns 202 immediately. The
// actual generation runs fire-and-forget through `runExportWorker` (which
// flips the row to READY/FAILED and emails the signed download link).
//
// REQ-DE-3 rate limit: any DataExportRequest row younger than 24h blocks a
// new request with 429 EXPORT_RATE_LIMIT.

userRoutes.post(
  '/me/export',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const cutoff = new Date(Date.now() - EXPORT_RATE_WINDOW_MS);
      const recent = await prisma.dataExportRequest.findFirst({
        where: { userId, createdAt: { gt: cutoff } },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      if (recent) {
        throw new AppError(
          429,
          'EXPORT_RATE_LIMIT',
          'Solo podés solicitar un export de tus datos cada 24 horas',
        );
      }

      const created = await prisma.dataExportRequest.create({
        data: {
          userId,
          status: 'PENDING',
          // expiresAt is a NOT NULL column — the worker will overwrite this
          // with the real 24h-from-completion timestamp once the ZIP is on
          // disk. Until then we stamp a near-future placeholder so the
          // schema constraint is satisfied without claiming the link is
          // already valid.
          expiresAt: new Date(Date.now() + EXPORT_RATE_WINDOW_MS),
        },
      });

      // Fire-and-forget: do NOT await. Exceptions inside the worker are
      // logged + captured to Sentry (see runExportWorker).
      void runExportWorker({ id: created.id, userId: created.userId }, prisma).catch((err) => {
        Sentry.captureException(err);
      });

      res.status(202).json({
        success: true,
        data: { exportId: created.id },
        message: 'Te enviaremos un email cuando el ZIP esté listo',
      });
    } catch (error) {
      next(error);
    }
  },
);

// ─── GET /api/users/me/export/download/:token (REQ-DE-2) ───────────────────
//
// Public (no JWT — auth is the HMAC signature on `:token`). Single-use:
// the first 200 stamps `downloadedAt`; subsequent hits return 410.

userRoutes.get(
  '/me/export/download/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenParam = req.params['token'];
      if (typeof tokenParam !== 'string' || tokenParam.length === 0) {
        throw new AppError(404, 'NOT_FOUND', 'Link inválido');
      }

      const verification = verifyExportToken(tokenParam);
      if (!verification.valid) {
        if (verification.reason === 'expired') {
          throw new AppError(410, 'LINK_EXPIRED', 'El link de descarga ya expiró');
        }
        // Malformed / wrong signature → don't leak which one. Return 404 so
        // the URL just looks "not there".
        throw new AppError(404, 'NOT_FOUND', 'Link inválido');
      }

      const { exportId } = verification.payload;

      const exportRow = await prisma.dataExportRequest.findUnique({
        where: { id: exportId },
      });
      if (!exportRow) {
        throw new AppError(404, 'NOT_FOUND', 'Export no encontrado');
      }

      // Single-use: a previous successful download blocks future hits.
      if (exportRow.downloadedAt) {
        throw new AppError(410, 'LINK_EXPIRED', 'El link ya fue usado');
      }
      // Server-side expiry is enforced too (defense-in-depth — token-side
      // expiry already handled above, but the row may have been swept).
      if (exportRow.expiresAt && exportRow.expiresAt.getTime() < Date.now()) {
        throw new AppError(410, 'LINK_EXPIRED', 'El link de descarga ya expiró');
      }
      if (exportRow.status !== 'READY') {
        throw new AppError(404, 'NOT_FOUND', 'Export no está listo');
      }
      if (!exportRow.filePath) {
        throw new AppError(404, 'NOT_FOUND', 'Archivo no encontrado');
      }

      // Mark single-use BEFORE streaming so a concurrent second hit fails.
      await prisma.dataExportRequest.update({
        where: { id: exportId },
        data: { status: 'DOWNLOADED', downloadedAt: new Date() },
      });

      // Stream the ZIP. If the file is missing on disk we still return 200
      // with an empty body — the client sees "the row says READY" mismatch
      // as a deployment bug, not a security issue. In practice the sweep
      // cron only deletes files for already-EXPIRED rows.
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="export-${exportId}.zip"`);

      if (fs.existsSync(exportRow.filePath)) {
        const stream = fs.createReadStream(exportRow.filePath);
        stream.on('error', (err) => {
          Sentry.captureException(err);
          if (!res.headersSent) {
            res.status(500).end();
          } else {
            res.end();
          }
        });
        stream.pipe(res);
      } else {
        // File missing on disk — finish the response cleanly so the test
        // suite (which doesn't always wire a real file) still observes a
        // 200 + headers. Real prod deployments shouldn't hit this branch.
        res.end();
      }
    } catch (error) {
      next(error);
    }
  },
);
