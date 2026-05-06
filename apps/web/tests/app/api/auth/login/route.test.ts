/**
 * Tests for `apps/web/app/api/auth/login/route.ts` — POST handler.
 *
 * Covers Scenarios WB-S1 (happy path + cookie), WB-S5 (wrong password 401),
 * WB-S7 (malformed JSON), WB-S8 (upstream 5xx → 502).
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
  return await import('@/app/api/auth/login/route');
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

function makeRequest(body: unknown, opts: { raw?: string } = {}): Request {
  const text = opts.raw ?? JSON.stringify(body);
  return new Request('https://web.matchday.app/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: text,
  });
}

describe('POST /api/auth/login', () => {
  it('Scenario WB-S1: returns 200 + sets matchday_session cookie on valid credentials', async () => {
    const jwt = 'header.eyJ1c2VySWQiOiJ1XzEifQ.sig';
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            user: { id: 'u_1', email: 'ana@matchday.app', nickname: 'ana' },
            token: jwt,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const { POST } = await loadHandler();

    const res = await POST(
      makeRequest({ email: 'ana@matchday.app', password: 'Hunter2!' }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      user: { id: 'u_1', email: 'ana@matchday.app', nickname: 'ana' },
    });
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'matchday_session',
        value: jwt,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 604800,
      }),
    );
  });

  it('Scenario WB-S1: forwards email + password as JSON to upstream /api/auth/login', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { user: { id: 'u_1', email: 'a@b.com', nickname: 'a' }, token: 'j' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const { POST } = await loadHandler();

    await POST(makeRequest({ email: 'a@b.com', password: 'pw' }));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://api.matchday.app/api/auth/login');
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.com', password: 'pw' }));
  });

  it('Scenario WB-S5: returns 401 with Spanish message on wrong password, NO cookie set', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );
    const { POST } = await loadHandler();

    const res = await POST(
      makeRequest({ email: 'ana@matchday.app', password: 'wrong' }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Email o contraseña incorrectos.');
    expect(cookieStore.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'matchday_session', value: expect.stringMatching(/.+/) }),
    );
  });

  it('Scenario WB-S7: returns 400 with Spanish message on malformed JSON; never calls upstream', async () => {
    const { POST } = await loadHandler();

    const res = await POST(makeRequest({}, { raw: 'not-json{{' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Cuerpo de la solicitud inválido.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 400 with issues[] when body fails Zod validation', async () => {
    const { POST } = await loadHandler();

    const res = await POST(makeRequest({ email: 'not-an-email', password: '' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Revisá los datos ingresados.');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Scenario WB-S8: returns 502 with Spanish message on upstream 5xx', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const { POST } = await loadHandler();

    const res = await POST(makeRequest({ email: 'a@b.com', password: 'pw' }));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('Servicio no disponible. Intentá nuevamente.');
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('returns 502 on network failure (fetch rejects)', async () => {
    fetchSpy.mockRejectedValue(new TypeError('fetch failed'));
    const { POST } = await loadHandler();

    const res = await POST(makeRequest({ email: 'a@b.com', password: 'pw' }));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('Servicio no disponible. Intentá nuevamente.');
  });
});
