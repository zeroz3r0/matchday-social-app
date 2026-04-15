// ============================================================================
// Club Routes — CRUD + Members
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const clubRoutes = Router();

const createClubSchema = z.object({
  name: z.string().min(2).max(40),
  badgeUrl: z.string().url().optional(),
  description: z.string().max(500).optional(),
  preferredFormation: z.string().max(20).optional(),
});

// ─── POST /api/clubs ────────────────────────────────────────────────────────

clubRoutes.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createClubSchema.parse(req.body);
    const userId = req.user!.userId;

    const club = await prisma.club.create({
      data: {
        ...data,
        createdById: userId,
        members: {
          create: { userId, role: 'ADMIN' },
        },
      },
      include: { members: true },
    });

    res.status(201).json({ success: true, data: club });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/clubs/:id ─────────────────────────────────────────────────────

clubRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.params['id'] },
      include: {
        members: {
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true, position: true } },
          },
        },
      },
    });

    if (!club) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Club no encontrado' } });
      return;
    }

    res.json({ success: true, data: club });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/clubs/:id/members — Add member ──────────────────────────────

clubRoutes.post('/:id/members', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requesterId = req.user!.userId;
    const clubId = req.params['id']!;

    // Verify requester is ADMIN of the club
    const requesterMember = await prisma.clubMember.findFirst({
      where: { clubId, userId: requesterId, role: 'ADMIN' },
    });
    if (!requesterMember) {
      throw new AppError(403, 'FORBIDDEN', 'Solo los administradores del club pueden agregar miembros');
    }

    const { userId, role } = z.object({
      userId: z.string(),
      role: z.enum(['CAPTAIN', 'PLAYER']).default('PLAYER'),
    }).parse(req.body);

    const member = await prisma.clubMember.create({
      data: { clubId: req.params['id']!, userId, role },
    });

    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/clubs — List user clubs ───────────────────────────────────────

clubRoutes.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const clubs = await prisma.club.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { members: true } } },
    });

    res.json({ success: true, data: clubs });
  } catch (error) {
    next(error);
  }
});
