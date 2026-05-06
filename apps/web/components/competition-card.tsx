/**
 * Presentational card for a competition list item.
 *
 * Spec: REQ-WP-9. Server component (no client state) — used inside the
 * SSR `/competiciones` list to render each row.
 *
 * Spanish labels:
 *   - LEAGUE      → "Liga"
 *   - TOURNAMENT  → "Torneo"
 *   - F5/F7/F11 are kept as-is (universal football shorthand).
 *
 * Dates use `Intl.DateTimeFormat('es-ES')` for a localized format.
 *
 * The whole card is wrapped in a Next `<Link>` so SSR HTML carries an
 * indexable href to the detail page (Scenario WP-S2 acceptance).
 */
import Link from 'next/link';
import type { Route } from 'next';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { CompetitionListItem } from '@/lib/types/competition';

const TYPE_LABELS: Record<CompetitionListItem['type'], string> = {
  LEAGUE: 'Liga',
  TOURNAMENT: 'Torneo',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DATE_FORMATTER.format(d);
}

export type CompetitionCardProps = {
  competition: CompetitionListItem;
  className?: string;
};

export function CompetitionCard({ competition, className }: CompetitionCardProps) {
  const typeLabel = TYPE_LABELS[competition.type];
  const startLabel = formatDate(competition.startDate);
  const endLabel = competition.endDate ? formatDate(competition.endDate) : null;

  return (
    <Link
      // typedRoutes (next.config.ts) is enabled but supports template-literal
      // string hrefs for known dynamic segments — Next infers the type at
      // build time from the file system.
      href={`/competiciones/${competition.id}` as Route}
      className={cn(
        'block rounded-lg transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2',
        className,
      )}
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-md border border-[var(--color-border)] px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-neutral-700">
              {typeLabel}
            </span>
            <span className="text-xs font-semibold text-neutral-500">{competition.gameType}</span>
          </div>
          <h2 className="text-xl font-semibold leading-none tracking-tight">{competition.name}</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-neutral-600">
          <p>{competition.city}</p>
          <p>
            {startLabel}
            {endLabel ? ` – ${endLabel}` : ''}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
