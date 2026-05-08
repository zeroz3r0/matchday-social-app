/**
 * Competition wire types — what the upstream API returns over JSON.
 *
 * The shared package's `Competition` interface uses `Date` objects (it's
 * the persistence shape). After `res.json()` everything is serialised to
 * ISO strings, so the BFF + RSC pages see strings on the wire.
 *
 * Per orchestrator brief: define inline here (don't extend `@matchday/shared`)
 * to avoid scope creep. A future `shared-wire-types` change can extract.
 *
 * Endpoints covered:
 *   GET /api/competitions          → CompetitionListResponse
 *   GET /api/competitions/:id      → CompetitionDetailResponse
 */

/** Raw competition shape as serialised by the API list endpoint. */
export type CompetitionListItem = {
  id: string;
  name: string;
  type: 'LEAGUE' | 'TOURNAMENT';
  gameType: 'F5' | 'F7' | 'F11';
  description: string | null;
  startDate: string;
  endDate: string | null;
  city: string;
  latitude: number;
  longitude: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

/** Detail endpoint adds `createdBy` (anonymized when soft-deleted) + `clubs`. */
export type CompetitionDetail = CompetitionListItem & {
  createdBy: {
    id: string | null;
    nickname: string;
  };
  clubs: Array<{
    competitionId: string;
    clubId: string;
    club: {
      id: string;
      name: string;
      badgeUrl: string | null;
    };
  }>;
  maxPostponeDays: number;
};

/** Envelope returned by GET /api/competitions. */
export type CompetitionListResponse = {
  success: true;
  data: CompetitionListItem[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
};

/** Envelope returned by GET /api/competitions/:id. */
export type CompetitionDetailResponse = {
  success: true;
  data: CompetitionDetail;
};

/** Filters parsed from `/competiciones` URL search params. */
export type CompetitionListFilters = {
  city?: string;
  type?: 'LEAGUE' | 'TOURNAMENT';
  gameType?: 'F5' | 'F7' | 'F11';
  cursor?: string;
};
