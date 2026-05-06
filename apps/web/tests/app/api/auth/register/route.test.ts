/**
 * Tests for `apps/web/app/api/auth/register/route.ts`.
 *
 * Covers Scenario WB-S2 (registration sets cookie), validation 400,
 * 409 EMAIL_TAKEN with Spanish copy, malformed JSON, upstream 5xx → 502.
 *
 * Mirror the API contract at `apps/api/src/routes/auth.ts:48-120` — register
 * returns 201 + `{ success, data: { user, token } }` on success.
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
  return await import('@/app/api/auth/register/route');
}

const fetchSpy = vi.spyOn(global, 'fetch');

const validBody = {
  email: 'nueva@matchday.app',
  password: 'Hunter2!8chars',
  nickname: 'ana_2026',
  position: 'MIDFIELDER' as const,
  acceptedTosVersion: '2026-01-01',
  acceptedPrivacyVersion: '2026-01-01',
};

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
  return new Request('https://web.matchday.app/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: text,
  });
}

describe('POST /api/auth/register', () => {
  it('Scenario WB-S2: returns 201 + sets cookie on successful registration', async () => {
    const jwt = 'h.eyJ1c2VySWQiOiJ1XzkifQ.s';
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            user: { id: 'u_9', email: validBody.email, nickname: validBody.nickname },
            token: jwt,
          },
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    const { POST } = await loadHandler();

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user).toMatchObject({ id: 'u_9', email: validBody.email });
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

  it('returns 400 with Spanish error and issues[] on Zod validation failure', async () => {
    const { POST } = await loadHandler();

    const res = await POST(makeRequest({ ...validBody, password: 'short' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Revisá los datos ingresados.');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 409 with Spanish "email already registered" message on EMAIL_TAKEN', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'EMAIL_TAKEN', message: 'taken' },
        }),
        { status: 409, headers: { 'content-type': 'application/json' } },
      ),
    );
    const { POST } = await loadHandler();

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Este correo ya está registrado.');
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('returns 400 with Spanish copy on malformed JSON; never calls upstream', async () => {
    const { POST } = await loadHandler();

    const res = await POST(makeRequest({}, { raw: '{{{' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Cuerpo de la solicitud inválido.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 502 on upstream 5xx, no cookie change', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({}), { status: 502 }),
    );
    const { POST } = await loadHandler();

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('Servicio no disponible. Intentá nuevamente.');
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('forwards full register body (including position + ToS versions) to upstream', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { user: { id: 'u_1', email: validBody.email, nickname: 'a' }, token: 'j' },
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    const { POST } = await loadHandler();

    await POST(makeRequest(validBody));

    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://api.matchday.app/api/auth/register');
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toMatchObject(validBody);
  });
});
