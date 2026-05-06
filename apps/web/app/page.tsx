/**
 * Placeholder home — Phase 1 only.
 *
 * The real landing page (Spanish hero + CTAs to /registro and /login) is
 * implemented in Phase 4 task T-WP-4.4. This placeholder exists so
 * `npm run web:dev` returns HTTP 200 at `/` (Scenario WA-S2) and
 * `npm run web:build` produces a `.next/BUILD_ID` (Scenario WA-S3).
 */
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Matchday</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Red social deportiva — bootstrap fase 1.
        </p>
      </div>
    </main>
  );
}
