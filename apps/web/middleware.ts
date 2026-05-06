/**
 * Edge middleware — protected-route redirect.
 *
 * Spec: REQ-WB-10. Orchestrator brief expanded the matcher beyond the
 * spec's empty default: routes that ALWAYS require a session redirect to
 * `/login?redirect=<original-path>` when the `matchday_session` cookie is
 * missing. The pages themselves (when they exist in Phase 4+) read the
 * cookie via `getSession()` for actual user data.
 *
 * Design decisions:
 * - Cookie presence check ONLY — no JWT decode/verify in middleware. Edge
 *   runtime is constrained; verification belongs in route handlers.
 * - Preserve the original pathname + query in `?redirect=` so post-login
 *   we can bounce the user back. We URI-encode the value.
 * - Redirect uses HTTP 307 (NextResponse.redirect default) — preserves the
 *   request method on the bounce target (relevant if a future protected
 *   POST route gets caught here).
 *
 * Matcher: covers routes that DO NOT exist yet (`/dashboard`, `/mi-perfil`,
 * `/competiciones/crear`) so future PRs only need to add page files; the
 * middleware is ready. Public routes (/, /login, /registro, /competiciones,
 * /competiciones/[id]) are NOT in the matcher and pass through unguarded.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export function middleware(req: NextRequest): NextResponse {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (cookie?.value) {
    return NextResponse.next();
  }

  // Build redirect target: /login?redirect=<encoded-original-path-with-query>
  const original = req.nextUrl.pathname + (req.nextUrl.search ?? '');
  const loginUrl = new URL('/login', req.nextUrl.origin);
  loginUrl.searchParams.set('redirect', original);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard',
    '/mi-perfil/:path*',
    '/mi-perfil',
    '/competiciones/crear',
  ],
};
