/**
 * /competiciones — SSR + ISR(60s) list.
 *
 * Spec: REQ-WP-2, REQ-WP-7, REQ-WP-8, REQ-WP-9.
 *
 * Behavior:
 *   - Reads filters from URL search params (`city`, `type`, `gameType`,
 *     `cursor`).
 *   - Fetches `${API_BASE_URL}/api/competitions` server-side via
 *     `publicApiFetch` with `next: { revalidate: 60, tags: ['competitions'] }`.
 *   - On API failure (network / 5xx / 4xx): renders a Spanish empty state
 *     with HTTP 200 — does NOT throw a 500 (Scenario WP-S7).
 *   - Each result is a `<CompetitionCard>` linking to the detail page.
 *   - Cursor pagination via "Ver más" link with `?cursor=…`.
 */
import Link from 'next/link';
import type { Route } from 'next';
import type { Metadata } from 'next';

import { CompetitionCard } from '@/components/competition-card';
import { publicApiFetch } from '@/lib/api-public';
import type {
  CompetitionListResponse,
  CompetitionListItem,
} from '@/lib/types/competition';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Competiciones',
  description:
    'Explorá las ligas y torneos de fútbol amateur en Matchday. Encontrá competiciones cerca tuyo y sumá tu club.',
};

type SearchParams = {
  city?: string;
  type?: string;
  gameType?: string;
  cursor?: string;
};

function normalizeFilter<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

const TYPE_VALUES = ['LEAGUE', 'TOURNAMENT'] as const;
const GAME_TYPE_VALUES = ['F5', 'F7', 'F11'] as const;

async function loadCompetitions(
  params: SearchParams,
): Promise<{ items: CompetitionListItem[]; nextCursor: string | null; failed: boolean }> {
  const query: Record<string, string | undefined> = {
    city: params.city || undefined,
    type: normalizeFilter(params.type, TYPE_VALUES),
    gameType: normalizeFilter(params.gameType, GAME_TYPE_VALUES),
    cursor: params.cursor || undefined,
  };

  try {
    const res = await publicApiFetch<CompetitionListResponse>('/api/competitions', {
      query,
      next: { revalidate: 60, tags: ['competitions'] },
    });
    return {
      items: res.data,
      nextCursor: res.pagination.nextCursor,
      failed: false,
    };
  } catch {
    return { items: [], nextCursor: null, failed: true };
  }
}

function buildNextHref(params: SearchParams, cursor: string): string {
  const search = new URLSearchParams();
  if (params.city) search.set('city', params.city);
  if (params.type) search.set('type', params.type);
  if (params.gameType) search.set('gameType', params.gameType);
  search.set('cursor', cursor);
  return `/competiciones?${search.toString()}`;
}

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { items, nextCursor, failed } = await loadCompetitions(params);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Competiciones</h1>
        <p className="text-sm text-neutral-600">
          Ligas y torneos abiertos en Matchday. Sumate al que mejor encaje con tu club.
        </p>
      </header>

      {failed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-medium">No se pudieron cargar las competiciones.</p>
          <p className="mt-1 text-sm">Intentá nuevamente en unos segundos.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-neutral-50 p-6 text-center text-neutral-600">
          <p>No hay competiciones que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((competition) => (
              <li key={competition.id}>
                <CompetitionCard competition={competition} />
              </li>
            ))}
          </ul>

          {nextCursor ? (
            <div className="flex justify-center">
              <Link
                href={buildNextHref(params, nextCursor) as Route}
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--color-border)] px-6 text-sm font-medium hover:bg-neutral-100"
              >
                Ver más
              </Link>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
