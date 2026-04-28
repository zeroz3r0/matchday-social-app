// ============================================================================
// Competition Routes — Leagues & Tournaments
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createCompetitionSchema,
  registerClubSchema,
  listCompetitionsQuerySchema,
} from '@matchday/shared';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { encodeCursor, decodeCursor } from '../utils/cursor';

export const competitionRoutes = Router();

// ─── GET /api/competitions ──────────────────────────────────────────────────
// Public list with filters + cursor pagination. NO auth.

competitionRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listCompetitionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const e of parsed.error.errors) {
        const path = e.path.join('.');
        if (!details[path]) details[path] = [];
        details[path]!.push(e.message);
      }
      throw new AppError(400, 'VALIDATION_ERROR', 'Datos de entrada invalidos', details);
    }
    const q = parsed.data;

    // Build where clause — undefined keys skipped.
    const where: { city?: string; type?: 'LEAGUE' | 'TOURNAMENT'; gameType?: 'F5' | 'F7' | 'F11' } =
      {};
    if (q.city !== undefined) where.city = q.city;
    if (q.type !== undefined) where.type = q.type;
    if (q.gameType !== undefined) where.gameType = q.gameType;

    // Decode cursor if present — null result means malformed.
    let cursorClause: { cursor: { id: string }; skip: number } | undefined;
    if (q.cursor !== undefined) {
      const decoded = decodeCursor(q.cursor);
      if (decoded === null) {
        throw new AppError(400, 'INVALID_CURSOR', 'Cursor invalido');
      }
      cursorClause = { cursor: { id: decoded.id }, skip: 1 };
    }

    const items = await prisma.competition.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      ...cursorClause,
    });

    const hasMore = items.length > q.limit;
    const page = hasMore ? items.slice(0, q.limit) : items;
    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

    res.json({
      success: true,
      data: page,
      pagination: { nextCursor, hasMore },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/competitions/:id ──────────────────────────────────────────────
// Public detail with creator + clubs. NO auth.

competitionRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id']!;
    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, nickname: true } },
        clubs: {
          include: {
            club: { select: { id: true, name: true, badgeUrl: true } },
          },
        },
      },
    });

    if (!competition) {
      throw new AppError(404, 'NOT_FOUND', 'Competicion no encontrada');
    }

    res.json({ success: true, data: competition });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/competitions ─────────────────────────────────────────────────

competitionRoutes.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createCompetitionSchema.parse(req.body);
      const userId = req.user!.userId;

      const competition = await prisma.competition.create({
        data: {
          ...data,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          createdById: userId,
        },
      });

      res.status(201).json({ success: true, data: competition });
    } catch (error) {
      next(error);
    }
  },
);

// ─── POST /api/competitions/:id/register — Register club ───────────────────

competitionRoutes.post(
  '/:id/register',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clubId } = registerClubSchema.parse(req.body);
      const competitionId = req.params['id']!;

      const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
      if (!competition) throw new AppError(404, 'NOT_FOUND', 'Competicion no encontrada');

      // Validate min squad size
      const memberCount = await prisma.clubMember.count({ where: { clubId } });
      const minRequired =
        competition.gameType === 'F5' ? 5 : competition.gameType === 'F7' ? 7 : 11;

      if (memberCount < minRequired) {
        throw new AppError(
          400,
          'INSUFFICIENT_SQUAD',
          `Plantilla minima: ${minRequired}. Tienes: ${memberCount}`,
        );
      }

      const registration = await prisma.competitionClub.create({
        data: { competitionId, clubId },
      });

      // If league, create standing entry
      if (competition.type === 'LEAGUE') {
        await prisma.leagueStanding.create({
          data: { competitionId, clubId },
        });
      }

      res.status(201).json({ success: true, data: registration });
    } catch (error) {
      next(error);
    }
  },
);

// ─── POST /api/competitions/:id/generate-calendar — Auto league schedule ───

competitionRoutes.post(
  '/:id/generate-calendar',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const competitionId = req.params['id']!;

      const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
      if (!competition) throw new AppError(404, 'NOT_FOUND', 'Competicion no encontrada');
      if (competition.createdById !== req.user!.userId) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'Solo el creador de la competicion puede generar el calendario',
        );
      }

      const clubs = await prisma.competitionClub.findMany({
        where: { competitionId },
        include: { club: true },
      });

      if (clubs.length < 2) throw new AppError(400, 'NOT_ENOUGH_TEAMS', 'Minimo 2 equipos');

      if (competition.type === 'LEAGUE') {
        // Round-robin: each team plays every other team once
        const matches = [];
        const startDate = new Date(competition.startDate);

        let weekOffset = 0;
        for (let i = 0; i < clubs.length; i++) {
          for (let j = i + 1; j < clubs.length; j++) {
            const matchDate = new Date(startDate);
            matchDate.setDate(matchDate.getDate() + weekOffset * 7);

            matches.push({
              gameType: competition.gameType,
              locationName: 'Por definir',
              locationAddress: 'Por definir',
              latitude: competition.latitude,
              longitude: competition.longitude,
              scheduledAt: matchDate,
              createdById: req.user!.userId,
              competitionId,
            });
            weekOffset++;
          }
        }

        // Bulk create matches
        await prisma.match.createMany({ data: matches });

        res.json({ success: true, message: `Calendario generado: ${matches.length} partidos` });
      } else {
        // Tournament: elimination brackets
        const numTeams = clubs.length;
        const brackets = [];
        let stage:
          | 'ROUND_OF_64'
          | 'ROUND_OF_32'
          | 'ROUND_OF_16'
          | 'QUARTER_FINAL'
          | 'SEMI_FINAL'
          | 'FINAL';

        if (numTeams <= 2) stage = 'FINAL';
        else if (numTeams <= 4) stage = 'SEMI_FINAL';
        else if (numTeams <= 8) stage = 'QUARTER_FINAL';
        else if (numTeams <= 16) stage = 'ROUND_OF_16';
        else if (numTeams <= 32) stage = 'ROUND_OF_32';
        else stage = 'ROUND_OF_64';

        // Shuffle clubs for random seeding
        const shuffled = [...clubs].sort(() => Math.random() - 0.5);
        const totalSlots = Math.pow(2, Math.ceil(Math.log2(numTeams)));

        for (let i = 0; i < totalSlots / 2; i++) {
          const home = shuffled[i * 2];
          const away = shuffled[i * 2 + 1];
          const isBypass = !away; // Odd number = bypass

          brackets.push({
            competitionId,
            stage,
            matchOrder: i + 1,
            homeClubId: home?.clubId ?? null,
            awayClubId: away?.clubId ?? null,
            isBypass,
            winnerId: isBypass ? (home?.clubId ?? null) : null,
          });
        }

        await prisma.tournamentBracket.createMany({ data: brackets });

        res.json({
          success: true,
          message: `Brackets generados: ${brackets.length} enfrentamientos`,
        });
      }
    } catch (error) {
      next(error);
    }
  },
);

// ─── GET /api/competitions/:id/standings — League table ─────────────────────

competitionRoutes.get('/:id/standings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const standings = await prisma.leagueStanding.findMany({
      where: { competitionId: req.params['id'] },
      include: { club: { select: { id: true, name: true, badgeUrl: true } } },
      orderBy: [{ points: 'desc' }, { goalsFor: 'desc' }],
    });

    res.json({ success: true, data: standings });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/competitions/:id/brackets — Tournament brackets ───────────────

competitionRoutes.get('/:id/brackets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brackets = await prisma.tournamentBracket.findMany({
      where: { competitionId: req.params['id'] },
      include: {
        homeClub: { select: { id: true, name: true, badgeUrl: true } },
        awayClub: { select: { id: true, name: true, badgeUrl: true } },
        winnerClub: { select: { id: true, name: true } },
      },
      orderBy: [{ stage: 'asc' }, { matchOrder: 'asc' }],
    });

    res.json({ success: true, data: brackets });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/competitions/:id/postpone/:matchId — Postpone match ─────────

competitionRoutes.post(
  '/:id/postpone/:matchId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { newDate } = z.object({ newDate: z.string().datetime() }).parse(req.body);
      const competitionId = req.params['id']!;
      const matchId = req.params['matchId']!;

      const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
      if (!competition) throw new AppError(404, 'NOT_FOUND', 'Competicion no encontrada');
      if (competition.createdById !== req.user!.userId) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'Solo el creador de la competicion puede aplazar partidos',
        );
      }

      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match) throw new AppError(404, 'NOT_FOUND', 'Partido no encontrado');

      // Check 2 week limit
      const maxDate = new Date(match.scheduledAt);
      maxDate.setDate(maxDate.getDate() + competition.maxPostponeDays);

      if (new Date(newDate) > maxDate) {
        throw new AppError(
          400,
          'POSTPONE_LIMIT',
          `No se puede aplazar mas de ${competition.maxPostponeDays} dias`,
        );
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: { scheduledAt: new Date(newDate), status: 'POSTPONED' },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);
