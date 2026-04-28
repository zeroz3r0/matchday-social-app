// ============================================================================
// SCHEMAS — Competition (Zod v3)
// ============================================================================
//
// Lifted from apps/api/src/routes/competitions.ts. Source of truth for
// competition payload validation across api + mobile. Zod v3 ONLY: use
// `.string().uuid()`, `.string().email()`, `.string().url()` — NEVER
// `z.uuid()`/`z.email()`/`z.url()`.

import { z } from 'zod';

import { MAX_COMPETITION_NAME_LENGTH } from '../constants';

// ─── createCompetitionSchema ────────────────────────────────────────────────

export const createCompetitionSchema = z.object({
  name: z.string().min(2).max(MAX_COMPETITION_NAME_LENGTH),
  type: z.enum(['LEAGUE', 'TOURNAMENT']),
  gameType: z.enum(['F5', 'F7', 'F11']),
  description: z.string().max(1000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  latitude: z.number(),
  longitude: z.number(),
  city: z.string().max(100),
});

export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;

// ─── registerClubSchema ─────────────────────────────────────────────────────

export const registerClubSchema = z.object({
  clubId: z.string().min(1),
});

export type RegisterClubInput = z.infer<typeof registerClubSchema>;

// ─── listCompetitionsQuerySchema ────────────────────────────────────────────

export const listCompetitionsQuerySchema = z.object({
  city: z.string().min(1).max(100).optional(),
  type: z.enum(['LEAGUE', 'TOURNAMENT']).optional(),
  gameType: z.enum(['F5', 'F7', 'F11']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export type ListCompetitionsQuery = z.infer<typeof listCompetitionsQuerySchema>;
