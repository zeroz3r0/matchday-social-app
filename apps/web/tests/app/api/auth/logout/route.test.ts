/**
 * Tests for `apps/web/app/api/auth/logout/route.ts`.
 *
 * Scenario WB-S4: 200 + cookie cleared with Max-Age=0. NO upstream call —
 * the API has no /logout endpoint; logout is purely a cookie clear on the
 * BFF side. The JWT remains valid until expiry (acceptable per design —
 * future `auth-refresh` change adds revocation).
 *
 * Orchestrator brief: returns 200 + `{ ok: true }` (NOT 204 as in earlier
 * spec REQ-WB-4). Spec REQ-WB-4 said 204; orchestrator overrides to 200.
 * We follow the orchestrator's more recent decision.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
}));

async function loadHandler() {
  return await import('@/app/api/auth/logout/route');
}

const fetchSpy = vi.spyOn(global, 'fetch');

beforeEach(() => {
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  fetchSpy.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

function makeRequest(): Request {
  return new Request('https://web.matchday.app/api/auth/logout', { method: 'POST' });
}

describe('POST /api/auth/logout', () => {
  it('Scenario WB-S4: returns 200 + { ok: true } and clears the cookie', async () => {
    const { POST } = await loadHandler();

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'matchday_session',
        value: '',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      }),
    );
  });

  it('does NOT call upstream API', async () => {
    const { POST } = await loadHandler();

    await POST(makeRequest());

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
