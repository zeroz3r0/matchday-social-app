// ============================================================================
// Ranking Routes — Ladderboard with Geo Filters
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { LOCAL_RANKING_RADIUS_KM } from '@matchday/shared';

export const rankingRoutes = Router();

const rankingQuerySchema = z.object({
  category: z.enum(['GOALS', 'ASSISTS', 'AVG_RATING', 'MVP_COUNT']),
  scope: z.enum(['LOCAL', 'CITY', 'NATIONAL']).default('NATIONAL'),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  city: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ─── GET /api/rankings ──────────────────────────────────────────────────────
// Uses raw SQL for PostGIS distance calculations on LOCAL scope.
// Falls back to Haversine approximation if PostGIS not available.

rankingRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = rankingQuerySchema.parse(req.query);

    // Build geo filter condition
    let geoFilter = '';
    const params: unknown[] = [];

    if (filters.scope === 'LOCAL' && filters.latitude && filters.longitude) {
      // PostGIS ST_DWithin or Haversine fallback
      // Using Haversine in SQL for portability
      geoFilter = `
        AND (
          6371 * acos(
            cos(radians($${params.length + 1}))
            * cos(radians(u.latitude))
            * cos(radians(u.longitude) - radians($${params.length + 2}))
            + sin(radians($${params.length + 1}))
            * sin(radians(u.latitude))
          )
        ) <= $${params.length + 3}
      `;
      params.push(filters.latitude, filters.longitude, LOCAL_RANKING_RADIUS_KM);
    } else if (filters.scope === 'CITY' && filters.city) {
      geoFilter = `AND u.city = $${params.length + 1}`;
      params.push(filters.city);
    }
    // NATIONAL = no geo filter

    let query: string;

    // REQ-AD-5: rankings list filters out soft-deleted users entirely (no
    // anonymized rows) so the leaderboard always reflects real, active
    // players. Applied at the SQL level via `u.deleted_at IS NULL`.
    const deletedFilter = 'AND u.deleted_at IS NULL';

    switch (filters.category) {
      case 'GOALS':
        query = `
          SELECT u.id as "userId", u.nickname, u.avatar_url as "avatarUrl",
                 COALESCE(SUM(ms.goals), 0)::int as value
          FROM users u
          LEFT JOIN match_stats ms ON ms.player_id = u.id
            AND ms.validation_status IN ('CONFIRMED', 'AUTO_CONFIRMED')
          WHERE u.latitude IS NOT NULL ${deletedFilter} ${geoFilter}
          GROUP BY u.id
          ORDER BY value DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        break;

      case 'ASSISTS':
        query = `
          SELECT u.id as "userId", u.nickname, u.avatar_url as "avatarUrl",
                 COALESCE(SUM(ms.assists), 0)::int as value
          FROM users u
          LEFT JOIN match_stats ms ON ms.player_id = u.id
            AND ms.validation_status IN ('CONFIRMED', 'AUTO_CONFIRMED')
          WHERE u.latitude IS NOT NULL ${deletedFilter} ${geoFilter}
          GROUP BY u.id
          ORDER BY value DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        break;

      case 'AVG_RATING':
        query = `
          SELECT u.id as "userId", u.nickname, u.avatar_url as "avatarUrl",
                 ROUND(COALESCE(AVG(pv.rating), 0)::numeric, 1)::float as value
          FROM users u
          LEFT JOIN player_votes pv ON pv.target_player_id = u.id
          WHERE u.latitude IS NOT NULL ${deletedFilter} ${geoFilter}
          GROUP BY u.id
          HAVING COUNT(pv.id) > 0
          ORDER BY value DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        break;

      case 'MVP_COUNT':
        query = `
          SELECT u.id as "userId", u.nickname, u.avatar_url as "avatarUrl",
                 (
                   SELECT COUNT(*) FROM mvp_results mr
                   WHERE mr.global_mvp_id = u.id
                      OR mr.home_team_mvp_id = u.id
                      OR mr.away_team_mvp_id = u.id
                 )::int as value
          FROM users u
          WHERE u.latitude IS NOT NULL ${deletedFilter} ${geoFilter}
          ORDER BY value DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        break;

      default:
        throw new Error(`Unknown ranking category: ${filters.category satisfies never}`);
    }

    params.push(filters.limit, filters.offset);

    const results = await prisma.$queryRawUnsafe<
      { userId: string; nickname: string; avatarUrl: string | null; value: number }[]
    >(query, ...params);

    // Add rank numbers
    const ranked = results.map((r, i) => ({
      rank: filters.offset + i + 1,
      ...r,
      category: filters.category,
    }));

    res.json({ success: true, data: ranked });
  } catch (error) {
    next(error);
  }
});
