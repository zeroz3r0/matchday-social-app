/**
 * Segment-specific 404 — overrides the global `app/not-found.tsx` for
 * `/competiciones/[id]` paths.
 *
 * Spec: REQ-WP-3 (Scenario WP-S5) — non-existent competition id MUST
 * render a Spanish 404.
 */
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Competición no encontrada',
  description: 'Esta competición no existe o fue eliminada de Matchday.',
};

export default function CompetitionNotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-20 text-center">
      <h1 className="text-4xl font-semibold">Competición no encontrada</h1>
      <p className="max-w-md text-neutral-600">
        Esta competición no existe o ya no está disponible. Echá un vistazo al resto del listado
        para encontrar otras opciones.
      </p>
      <Link
        href="/competiciones"
        className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-6 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
      >
        Volver a competiciones
      </Link>
    </main>
  );
}
