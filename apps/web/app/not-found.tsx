/**
 * Global 404 boundary — Spanish copy.
 *
 * Spec: REQ-WP-5, REQ-WP-7 (Scenario WP-S5).
 *
 * Server component. Rendered by Next when:
 *   - A route doesn't match any file.
 *   - A page calls `notFound()` from `next/navigation`.
 *
 * Sibling `not-found.tsx` files (e.g. inside `(public)/competiciones/[id]/`)
 * override this for nested segments.
 */
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada | Matchday',
  description: 'La página que estás buscando no existe o fue movida.',
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold">404 — Página no encontrada</h1>
      <p className="max-w-md text-neutral-600">
        La página que estás buscando no existe o fue movida. Volvé al inicio para seguir explorando
        Matchday.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-6 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
