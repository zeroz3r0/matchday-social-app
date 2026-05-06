/**
 * Test-only shim for the `server-only` package.
 *
 * The real `server-only` throws at import time when bundled into a client
 * component to prevent server-only code from leaking to the browser. Vitest
 * is neither a server nor a client component bundling context — it's a Node
 * test runtime — so the guard fires incorrectly. We alias `server-only` to
 * this empty module via `vitest.config.ts#resolve.alias`.
 *
 * The production guarantee that server-only modules don't leak to the
 * browser is enforced by Next.js's bundler at build time, not by this
 * runtime check, so aliasing here doesn't weaken the production contract.
 */
export {};
