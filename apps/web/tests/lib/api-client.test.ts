/**
 * Tests for `apps/web/lib/api-client.ts` — server-only fetch wrapper.
 *
 * Contract (per orchestrator brief):
 * - Reads `process.env.API_BASE_URL ?? 'http://localhost:3000'` and
 *   trim trailing slash defensively.
 * - When `auth: true`, reads cookie via `getSession`-equivalent and adds
 *   `Authorization: Bearer <jwt>`.
 * - Throws `ApiUnauthorizedError` on 401.
 * - Throws `ApiValidationError` on 400 (with body for caller).
 * - Throws `ApiNetworkError` on 5xx or fetch failure.
 * - Returns parsed JSON envelope as-is on 2xx (the API uses
 *   `{ success, data }` shape — caller chooses to unwrap or not since some
 *   endpoints return the raw object).
 * - Pure function: never mutates cookies. The cookie clear logic lives in
 *   route handlers, not here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = {
  get: vi.fn<(name: string) => { name: string; value: string } | undefined>(),
  set: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
}));

async function loadModule() {
  return await import('@/lib/api-client');
}

describe('apiFetch', () => {
  const originalEnv = process.env.API_BASE_URL;
  const fetchSpy = vi.spyOn(global, 'fetch');

  beforeEach(() => {
    cookieStore.get.mockReset();
    fetchSpy.mockReset();
  });

  afterEach(() => {
    process.env.API_BASE_URL = originalEnv;
    vi.resetModules();
  });

  it('uses API_BASE_URL env var as the prefix', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { apiFetch } = await loadModule();

    await apiFetch('/api/health');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://api.matchday.app/api/health');
  });

  it('falls back to http://localhost:3000 when API_BASE_URL is unset', async () => {
    delete process.env.API_BASE_URL;
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { apiFetch } = await loadModule();

    await apiFetch('/api/health');

    expect(fetchSpy.mock.calls[0]?.[0]).toBe('http://localhost:3000/api/health');
  });

  it('trims trailing slash from API_BASE_URL', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app/';
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { apiFetch } = await loadModule();

    await apiFetch('/api/health');

    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://api.matchday.app/api/health');
  });

  it('returns parsed JSON body on 2xx', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: 'u_1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { apiFetch } = await loadModule();

    const body = await apiFetch<{ success: boolean; data: { id: string } }>('/api/users/me');

    expect(body).toEqual({ success: true, data: { id: 'u_1' } });
  });

  it('does NOT add Authorization header by default', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { apiFetch } = await loadModule();

    await apiFetch('/api/health');

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBeNull();
  });

  it('adds Authorization: Bearer <jwt> when auth: true and cookie is present', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    const jwt = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(
      JSON.stringify({ userId: 'u', email: 'e@e.com', exp: 9999999999 }),
    ).toString('base64url')}.sig`;
    cookieStore.get.mockReturnValue({ name: 'matchday_session', value: jwt });
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { apiFetch } = await loadModule();

    await apiFetch('/api/users/me', { auth: true });

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${jwt}`);
  });

  it('throws ApiUnauthorizedError on 401', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'wrong' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );
    const { apiFetch, ApiUnauthorizedError } = await loadModule();

    await expect(apiFetch('/api/users/me', { auth: true })).rejects.toBeInstanceOf(
      ApiUnauthorizedError,
    );
  });

  it('throws ApiValidationError on 400 carrying the parsed body', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    const errorBody = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'bad input' },
    };
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(errorBody), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { apiFetch, ApiValidationError } = await loadModule();

    try {
      await apiFetch('/api/auth/login', { method: 'POST' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiValidationError);
      expect((err as InstanceType<typeof ApiValidationError>).status).toBe(400);
      expect((err as InstanceType<typeof ApiValidationError>).body).toEqual(errorBody);
    }
  });

  it('throws ApiNetworkError on 5xx', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL' } }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { apiFetch, ApiNetworkError } = await loadModule();

    await expect(apiFetch('/api/users/me')).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it('throws ApiNetworkError when fetch itself rejects (network down)', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    fetchSpy.mockRejectedValue(new TypeError('fetch failed'));
    const { apiFetch, ApiNetworkError } = await loadModule();

    await expect(apiFetch('/api/users/me')).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it('does NOT mutate cookies on 401 (caller is responsible)', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: 'INVALID_CREDENTIALS' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { apiFetch } = await loadModule();

    await apiFetch('/api/users/me', { auth: true }).catch(() => undefined);

    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
