/**
 * Landing page — `/` (SSG).
 *
 * Spec: REQ-WP-1 (SSG, no `dynamic`/`revalidate`), REQ-WP-7 (Spanish
 * copy), REQ-WP-8 (title + description metadata), REQ-WP-10 (primary
 * CTA → /registro, secondary → /login).
 *
 * Tone (per orchestrator brief): tight, professional, in Spanish
 * (Castilian neutral). Replaces the Phase 1 placeholder.
 */
import Link from 'next/link';
import type { Metadata } from 'next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Matchday — Fútbol amateur conectado',
  description:
    'Organiza partidos, ligas y torneos de fútbol amateur. Encontrá rivales, llevá estadísticas validadas por la comunidad y votá al MVP del partido.',
};

const FEATURES = [
  {
    title: 'Organiza partidos',
    body: 'Creá partidos F5, F7 o F11 en minutos. Convocá rivales, gestioná disponibilidad y mantené todo en un solo lugar.',
  },
  {
    title: 'Compite en ligas y torneos',
    body: 'Sumá tu club a competiciones públicas. Calendario, clasificación y eliminatorias generadas automáticamente.',
  },
  {
    title: 'Stats validadas por la comunidad',
    body: 'Goles, asistencias y partidos jugados son confirmados por los rivales — no inflados por nadie.',
  },
  {
    title: 'Vota al MVP del partido',
    body: 'Cada encuentro cierra con la elección del MVP entre los protagonistas. Reconocimiento real, no algoritmos.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Matchday — Fútbol amateur conectado
          </h1>
          <p className="max-w-2xl text-lg text-neutral-600">
            La plataforma para organizar partidos, ligas y torneos de fútbol amateur F5, F7
            y F11 con tu club y rivales.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-primary)] px-8 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
            >
              Crear cuenta
            </Link>
            <Link
              href="/competiciones"
              className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--color-border)] px-8 text-sm font-medium hover:bg-neutral-100"
            >
              Ver competiciones
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
          Todo lo que necesita tu equipo
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-neutral-500 sm:flex-row">
          <p>© 2026 Matchday</p>
          <Link href="/competiciones" className="hover:text-[var(--color-primary)]">
            Explorar competiciones
          </Link>
        </div>
      </footer>
    </>
  );
}
