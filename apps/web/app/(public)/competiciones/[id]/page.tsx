/**
 * /competiciones/[id] — SSR detail page with ISR (60s).
 *
 * Spec: REQ-WP-3, REQ-WP-7, REQ-WP-8, REQ-WP-9. Scenarios WP-S3, WP-S5.
 *
 * Behavior:
 *   - Calls `${API}/api/competitions/[id]`. On 404 → `notFound()`
 *     (renders the segment's `not-found.tsx`).
 *   - On success: renders name (h1), type, gameType, city, dates,
 *     description, creator handle, list of registered clubs.
 *   - `generateMetadata` returns title `<name> | Matchday` and a
 *     description truncated from the competition's `description` field
 *     (≥50 chars Spanish copy fallback for empty descriptions).
 *   - Canonical link emitted via `metadata.alternates.canonical` so the
 *     rendered HTML carries `<link rel="canonical">` (REQ-WP-8 acceptance).
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import {
  publicApiFetch,
  PublicApiNetworkError,
  PublicApiNotFoundError,
} from '@/lib/api-public';
import type {
  CompetitionDetail,
  CompetitionDetailResponse,
} from '@/lib/types/competition';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://matchday.app';

const TYPE_LABELS: Record<CompetitionDetail['type'], string> = {
  LEAGUE: 'Liga',
  TOURNAMENT: 'Torneo',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DATE_FORMATTER.format(d);
}

function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}

async function loadCompetition(id: string): Promise<CompetitionDetail | null> {
  try {
    const res = await publicApiFetch<CompetitionDetailResponse>(
      `/api/competitions/${encodeURIComponent(id)}`,
      { next: { revalidate: 60, tags: ['competitions', `competition:${id}`] } },
    );
    return res.data;
  } catch (err) {
    if (err instanceof PublicApiNotFoundError) return null;
    if (err instanceof PublicApiNetworkError) throw err;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const competition = await loadCompetition(id);
  if (!competition) {
    return {
      title: 'Competición no encontrada',
      description: 'Esta competición no existe o fue eliminada de Matchday.',
    };
  }

  const description =
    competition.description && competition.description.trim().length > 0
      ? truncate(competition.description, 160)
      : `Competición de fútbol ${TYPE_LABELS[competition.type].toLowerCase()} ${competition.gameType} en ${competition.city}. Mirá los detalles, los clubes inscritos y sumate desde Matchday.`;

  return {
    title: competition.name,
    description,
    alternates: {
      canonical: `${SITE_URL}/competiciones/${competition.id}`,
    },
  };
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const competition = await loadCompetition(id);
  if (!competition) notFound();

  const typeLabel = TYPE_LABELS[competition.type];
  const startLabel = formatDate(competition.startDate);
  const endLabel = formatDate(competition.endDate);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-[var(--color-border)] px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-neutral-700">
            {typeLabel}
          </span>
          <span className="text-xs font-semibold text-neutral-500">
            {competition.gameType}
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {competition.name}
        </h1>
        <p className="text-sm text-neutral-600">
          {competition.city}
          {startLabel ? ` · ${startLabel}` : ''}
          {endLabel ? ` – ${endLabel}` : ''}
        </p>
      </header>

      {competition.description ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Descripción</h2>
          <p className="whitespace-pre-line text-neutral-700">
            {competition.description}
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Organizador</h2>
        <p className="text-neutral-700">
          {competition.createdBy.nickname || 'Usuario eliminado'}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">
          Clubes inscritos ({competition.clubs.length})
        </h2>
        {competition.clubs.length === 0 ? (
          <p className="text-sm text-neutral-600">
            Aún no hay clubes inscritos. Sé el primero en sumarte desde la app.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {competition.clubs.map((row) => (
              <li
                key={row.clubId}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                {row.club.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
