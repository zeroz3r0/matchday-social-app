/**
 * Tests for `apps/web/app/api/auth/me/route.ts`.
 *
 * Scenario WB-S3 (200 valid cookie), WB-S6 (tampered/expired → 401 + clear),
 * missing cookie → 401 + clear, upstream 5xx → 502 (no cookie change per
 * REQ-WB-7).
 *
 * Proxies to `GET /api/users/me` (verified-existing at
 * `apps/api/src/routes/users.ts:30`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = {
  get: vi.fn<(name: string) => { name: string; value: string } | undefined>(),
  set: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
}));

async function loadHandler() {
  return await import('@/app/api/auth/me/route');
}

const fetchSpy = vi.spyOn(global, 'fetch');

beforeEach(() => {
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  fetchSpy.mockReset();
  process.env.API_BASE_URL = 'https://api.matchday.app';
});

afterEach(() => {
  vi.resetModules();
});

function makeRequest(): Request {
  return new Request('https://web.matchday.app/api/auth/me', { method: 'GET' });
}

describe('GET /api/auth/me', () => {
  it('returns 401 + clears cookie when no session cookie is present', async () => {
    cookieStore.get.mockReturnValue(undefined);
    const { GET } = await loadHandler();

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'matchday_session', value: '', maxAge: 0 }),
    );
  });

  it('Scenario WB-S3: returns 200 with user data when upstream accepts the JWT', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = `h.${Buffer.from(
      JSON.stringify({ userId: 'u_1', email: 'ana@matchday.app', exp }),
    ).toString('base64url')}.s`;
    cookieStore.get.mockReturnValue({ name: 'matchday_session', value: jwt });
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'u_1',
            email: 'ana@matchday.app',
            nickname: 'ana',
            position: 'MIDFIELDER',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const { GET } = await loadHandler();

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({ id: 'u_1', email: 'ana@matchday.app' });
    // Cookie NOT cleared on success
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('Scenario WB-S3: forwards Authorization: Bearer to /api/users/me', async () => {
    const exp = 9999999999;
    const jwt = `h.${Buffer.from(JSON.stringify({ userId: 'u_1', email: 'a@b.com', exp })).toString(
      'base64url',
    )}.s`;
    cookieStore.get.mockReturnValue({ name: 'matchday_session', value: jwt });
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: 'u_1', email: 'a@b.com' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { GET } = await loadHandler();

    await GET(makeRequest());

    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://api.matchday.app/api/users/me');
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${jwt}`);
  });

  it('Scenario WB-S6: returns 401 + clears cookie when upstream rejects JWT', async () => {
    const jwt = `h.${Buffer.from(
      JSON.stringify({ userId: 'u_1', email: 'a@b.com', exp: 1 }),
    ).toString('base64url')}.s`;
    cookieStore.get.mockReturnValue({ name: 'matchday_session', value: jwt });
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { GET } = await loadHandler();

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'matchday_session', value: '', maxAge: 0 }),
    );
  });

  it('returns null cookie clear when JWT is malformed (cannot decode)', async () => {
    cookieStore.get.mockReturnValue({ name: 'matchday_session', value: 'tampered' });
    const { GET } = await loadHandler();

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'matchday_session', value: '', maxAge: 0 }),
    );
  });

  it('returns 502 on upstream 5xx WITHOUT clearing the cookie (REQ-WB-7)', async () => {
    const jwt = `h.${Buffer.from(
      JSON.stringify({ userId: 'u_1', email: 'a@b.com', exp: 9999999999 }),
    ).toString('base64url')}.s`;
    cookieStore.get.mockReturnValue({ name: 'matchday_session', value: jwt });
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({}), { status: 503 }));
    const { GET } = await loadHandler();

    const res = await GET(makeRequest());

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('Servicio no disponible. Intentá nuevamente.');
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
