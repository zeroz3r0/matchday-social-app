/**
 * /login — server component.
 *
 * Spec: REQ-WP-4, REQ-WP-6, REQ-WP-7, REQ-WP-8.
 *
 * Behavior:
 *   - If a session cookie is present, redirect to /dashboard
 *     (Scenario WP-S4 — orchestrator brief refines spec's `/` to `/dashboard`).
 *   - Otherwise render the Spanish form via the `<LoginForm>` client component.
 *
 * Uses `getSession()` (cookie decode, no upstream call) — fast guard.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

import { getSession } from '@/lib/auth';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description:
    'Iniciá sesión en Matchday para gestionar tus partidos, ligas y torneos de fútbol amateur.',
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="text-sm text-neutral-600">
          ¿No tenés cuenta?{' '}
          <Link
            href="/registro"
            className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
