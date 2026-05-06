/**
 * Tests for `apps/web/lib/auth.ts` — server-only session cookie helpers.
 *
 * Design notes:
 * - Cookie name: `matchday_session` (design §3, REQ-WB-2).
 * - Value: raw API JWT, NOT re-signed.
 * - `getSession` DECODES the JWT payload without verifying — the API verifies
 *   on every server-to-server call, so the web app only needs `userId`/`exp`
 *   for redirect hints. Decode = `JSON.parse(Buffer.from(parts[1],'base64url'))`.
 * - `requireSession` throws `UnauthorizedError` when no session — callers
 *   decide whether to redirect or 401.
 * - `setSessionCookie` / `clearSessionCookie` use Next 15's async `cookies()`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/headers BEFORE importing the module under test.
const cookieStore = {
  get: vi.fn<(name: string) => { name: string; value: string } | undefined>(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
}));

// Helper to build a fake JWT (header.payload.signature, base64url payload).
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

// Lazy import to ensure the mock is applied first.
async function loadModule() {
  return await import('@/lib/auth');
}

describe('getSession', () => {
  beforeEach(() => {
    cookieStore.get.mockReset();
    cookieStore.set.mockReset();
    cookieStore.delete.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns null when the cookie is absent', async () => {
    cookieStore.get.mockReturnValue(undefined);
    const { getSession } = await loadModule();

    const session = await getSession();

    expect(session).toBeNull();
    expect(cookieStore.get).toHaveBeenCalledWith('matchday_session');
  });

  it('decodes JWT payload and returns userId/email/exp when cookie is present', async () => {
    const exp = Math.floor(Date.now() / 1000) + 60 * 60;
    const jwt = makeJwt({ userId: 'usr_42', email: 'ana@matchday.app', exp });
    cookieStore.get.mockReturnValue({ name: 'matchday_session', value: jwt });
    const { getSession } = await loadModule();

    const session = await getSession();

    expect(session).toEqual({ userId: 'usr_42', email: 'ana@matchday.app', exp });
  });

  it('returns null when the cookie value is not a valid JWT shape (no two dots)', async () => {
    cookieStore.get.mockReturnValue({ name: 'matchday_session', value: 'not-a-jwt' });
    const { getSession } = await loadModule();

    const session = await getSession();

    expect(session).toBeNull();
  });

  it('returns null when the JWT payload is not valid JSON', async () => {
    const header = Buffer.from('{}').toString('base64url');
    const garbage = Buffer.from('not-json{{').toString('base64url');
    cookieStore.get.mockReturnValue({
      name: 'matchday_session',
      value: `${header}.${garbage}.sig`,
    });
    const { getSession } = await loadModule();

    expect(await getSession()).toBeNull();
  });
});

describe('requireSession', () => {
  beforeEach(() => {
    cookieStore.get.mockReset();
  });

  it('returns the session when present', async () => {
    const jwt = makeJwt({ userId: 'usr_1', email: 'a@b.com', exp: 9999999999 });
    cookieStore.get.mockReturnValue({ name: 'matchday_session', value: jwt });
    const { requireSession } = await loadModule();

    const session = await requireSession();

    expect(session.userId).toBe('usr_1');
  });

  it('throws UnauthorizedError when no cookie', async () => {
    cookieStore.get.mockReturnValue(undefined);
    const { requireSession, UnauthorizedError } = await loadModule();

    await expect(requireSession()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('setSessionCookie', () => {
  beforeEach(() => {
    cookieStore.set.mockReset();
  });

  it('sets the cookie with all required attributes', async () => {
    const { setSessionCookie } = await loadModule();
    const jwt = makeJwt({ userId: 'x', email: 'x@x.com', exp: 1 });

    await setSessionCookie(jwt);

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const call = cookieStore.set.mock.calls[0];
    // Next's cookies().set() accepts either (name, value, opts) OR ({ name, value, ...opts }).
    // We use the object form so options are explicit.
    const arg = call?.[0];
    expect(arg).toMatchObject({
      name: 'matchday_session',
      value: jwt,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 604800,
    });
  });
});

describe('clearSessionCookie', () => {
  beforeEach(() => {
    cookieStore.set.mockReset();
  });

  it('sets the cookie with empty value and Max-Age=0', async () => {
    const { clearSessionCookie } = await loadModule();

    await clearSessionCookie();

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const arg = cookieStore.set.mock.calls[0]?.[0];
    expect(arg).toMatchObject({
      name: 'matchday_session',
      value: '',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  });
});
