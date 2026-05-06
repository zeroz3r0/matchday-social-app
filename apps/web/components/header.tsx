/**
 * Site header — server component.
 *
 * Reads `getSession()` from `lib/auth.ts` (cookie decode, no upstream call)
 * to decide whether to render anonymous CTAs or the logged-in menu.
 *
 * Always present:
 *   - Brand "Matchday" link to "/".
 *   - "Competiciones" nav link.
 *
 * Anonymous-only:
 *   - "Iniciar sesión" link → /login.
 *   - "Crear cuenta" link → /registro.
 *
 * Logged-in only:
 *   - User email visible.
 *   - "Cerrar sesión" client button (POSTs to /api/auth/logout).
 *
 * Mobile-friendly polish (collapsing nav) is deferred to Sprint 2.5.
 */
import Link from 'next/link';

import { getSession } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';

export async function Header() {
  const session = await getSession();
  const isAuthed = session !== null;

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Matchday
          </Link>
          <nav>
            <Link
              href="/competiciones"
              className="text-sm text-neutral-700 hover:text-[var(--color-primary)]"
            >
              Competiciones
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAuthed ? (
            <>
              <span className="hidden text-sm text-neutral-600 sm:inline">
                {session.email}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
