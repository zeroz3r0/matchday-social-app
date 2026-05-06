/**
 * /dashboard — protected placeholder.
 *
 * Defense in depth: middleware should already redirect anonymous requests
 * (matcher includes `/dashboard`), but this server component re-checks
 * via `requireSession()` and redirects to /login if the cookie is gone
 * (e.g. tampered + middleware bypassed locally).
 *
 * Sprint 2 scope: minimal "you're in" placeholder. Real dashboard widgets
 * (matches, teams, notifications) land in Sprint 3+.
 */
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getSession } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';

export const metadata: Metadata = {
  title: 'Tu panel',
  description: 'Tu panel personal en Matchday — partidos, equipos y notificaciones.',
};

// Force dynamic rendering — depends on cookies.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Bienvenido, {session.email}
        </h1>
        <p className="text-sm text-neutral-600">
          Próximamente: tus partidos, equipos y notificaciones.
        </p>
      </header>

      <section className="rounded-lg border border-[var(--color-border)] bg-neutral-50 p-6">
        <p className="text-sm text-neutral-700">
          Estamos terminando de cocinar el panel principal. Mientras tanto, podés explorar
          las{' '}
          <a
            href="/competiciones"
            className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            competiciones públicas
          </a>{' '}
          o cerrar sesión.
        </p>
      </section>

      <div className="flex justify-start">
        <LogoutButton />
      </div>
    </main>
  );
}
