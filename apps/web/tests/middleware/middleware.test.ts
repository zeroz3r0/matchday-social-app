/**
 * Tests for `apps/web/middleware.ts` — protected-route redirect.
 *
 * Spec: REQ-WB-10. Orchestrator brief: matcher includes `/dashboard/*`,
 * `/mi-perfil/*`, `/competiciones/crear` (these routes don't exist yet but
 * the middleware should be ready). When the `matchday_session` cookie is
 * absent, redirect to `/login?redirect=<encoded-original-path>`.
 *
 * We exercise the middleware function with a NextRequest-shaped object and
 * assert the response. We do NOT validate the matcher config beyond
 * importing it — Next.js evaluates `config.matcher` in its runtime.
 */
import { describe, expect, it } from 'vitest';
import { middleware, config } from '@/middleware';
import { NextRequest } from 'next/server';

function makeRequest(pathname: string, opts: { hasCookie?: boolean } = {}): NextRequest {
  const url = new URL(`https://web.matchday.app${pathname}`);
  const req = new NextRequest(new Request(url, { method: 'GET' }));
  if (opts.hasCookie) {
    req.cookies.set('matchday_session', 'fake-jwt');
  }
  return req;
}

describe('middleware', () => {
  it('redirects to /login?redirect=<path> when no session cookie is present', async () => {
    const req = makeRequest('/dashboard');

    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    const url = new URL(location as string);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirect')).toBe('/dashboard');
  });

  it('preserves query string in the redirect parameter', async () => {
    const req = makeRequest('/mi-perfil/editar?tab=foto');

    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    const url = new URL(location as string);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirect')).toBe('/mi-perfil/editar?tab=foto');
  });

  it('passes through (NextResponse.next) when session cookie is present', async () => {
    const req = makeRequest('/dashboard', { hasCookie: true });

    const res = middleware(req);

    // NextResponse.next() returns a 200-ish response with no Location header.
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  it('exports a `config` object with a non-empty matcher', () => {
    expect(config).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect((config.matcher as string[]).length).toBeGreaterThan(0);
  });

  it('matcher targets at least /dashboard, /mi-perfil, /competiciones/crear', () => {
    const matcherStr = JSON.stringify(config.matcher);
    expect(matcherStr).toContain('dashboard');
    expect(matcherStr).toContain('mi-perfil');
    expect(matcherStr).toContain('competiciones/crear');
  });
});
