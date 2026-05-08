/**
 * Global error boundary — Spanish copy.
 *
 * Spec: REQ-WP-7. MUST be a client component (Next requires it for `error.tsx`).
 *
 * Catches errors thrown during render in any nested route segment that
 * doesn't define its own `error.tsx`. Provides a "reset" button that
 * triggers Next to retry the failed segment.
 */
'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the browser console; future Sentry hook can replace this.
    // eslint-disable-next-line no-console
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold">Algo salió mal</h1>
      <p className="max-w-md text-neutral-600">
        Ocurrió un error inesperado. Inténtalo de nuevo en unos segundos.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-6 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
      >
        Reintentar
      </button>
    </main>
  );
}
