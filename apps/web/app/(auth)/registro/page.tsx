/**
 * /registro — server component.
 *
 * Spec: REQ-WP-4, REQ-WP-6, REQ-WP-7, REQ-WP-8.
 *
 * Behavior:
 *   - Redirect logged-in users to /dashboard (Scenario WP-S4).
 *   - Otherwise: fetch the current ToS + Privacy versions from the public
 *     legal endpoints and pass them as props to the `<RegisterForm>`
 *     client component. The form needs them to satisfy
 *     `acceptedTosVersion` / `acceptedPrivacyVersion` in the API contract.
 *
 * If the legal endpoint is unreachable, fall back to `'v1'` (current
 * version on master) — the worst case is a transient mismatch the user
 * sees as a Spanish error after submit.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

import { getSession } from '@/lib/auth';
import { publicApiFetch, PublicApiNetworkError } from '@/lib/api-public';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description:
    'Creá tu cuenta en Matchday y empezá a organizar partidos, ligas y torneos de fútbol amateur.',
};

const FALLBACK_VERSION = 'v1';

type LegalDocResponse = {
  success: true;
  data: { version: string; content: string };
};

async function readLegalVersion(path: '/api/legal/tos' | '/api/legal/privacy'): Promise<string> {
  try {
    const res = await publicApiFetch<LegalDocResponse>(path, {
      next: { revalidate: 300 },
    });
    return res.data.version;
  } catch (err) {
    if (err instanceof PublicApiNetworkError) return FALLBACK_VERSION;
    return FALLBACK_VERSION;
  }
}

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  const [tosVersion, privacyVersion] = await Promise.all([
    readLegalVersion('/api/legal/tos'),
    readLegalVersion('/api/legal/privacy'),
  ]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="text-sm text-neutral-600">
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
      <RegisterForm tosVersion={tosVersion} privacyVersion={privacyVersion} />
    </main>
  );
}
