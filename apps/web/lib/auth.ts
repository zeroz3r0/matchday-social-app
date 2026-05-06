/**
 * Server-only session helpers — design §3 (REQ-WB-2, REQ-WB-5, REQ-WB-11).
 *
 * The web app stores the upstream API JWT verbatim in an `HttpOnly; Secure;
 * SameSite=Lax` cookie named `matchday_session`. We DECODE the JWT payload
 * here for redirect hints (userId, exp), but we never VERIFY the signature —
 * verification is the API's responsibility on every server-to-server call.
 *
 * Why decode at all? RSC components and route handlers benefit from a quick
 * read of `userId` and `exp` to short-circuit redirects without paying for
 * an upstream round-trip. The actual auth check still lives behind every
 * `fetch` to `apps/api`.
 *
 * Decode strategy: `JSON.parse(Buffer.from(parts[1], 'base64url').toString())`.
 * Three lines, zero deps. We don't need `jose` / `jsonwebtoken` because we
 * don't verify.
 *
 * IMPORTANT: this module reads cookies via `next/headers`, which makes it
 * server-only. Do NOT import from a `'use client'` file.
 */
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'matchday_session';

/** 7 days in seconds — matches REQ-WB-2 cookie Max-Age. */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 604800;

export type Session = {
  userId: string;
  email: string;
  /** Unix epoch seconds — when the JWT expires (set by the API). */
  exp: number;
};

/**
 * Thrown by `requireSession` when no session cookie is present or it cannot
 * be decoded. Callers (route handlers, RSC pages) catch this and decide
 * whether to redirect to `/login` or return 401.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'No autenticado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Decode the JWT payload WITHOUT verifying. Returns `null` if the cookie
 * value is malformed (missing dots, payload not JSON, missing required
 * fields).
 */
function decodeJwtPayload(jwt: string): Session | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;

  const payload = parts[1];
  if (!payload) return null;

  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<Session>;
    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    return { userId: parsed.userId, email: parsed.email, exp: parsed.exp };
  } catch {
    return null;
  }
}

/**
 * Read the `matchday_session` cookie and return the decoded session, or
 * `null` if the cookie is absent or malformed.
 *
 * Does NOT contact the upstream API. Does NOT verify the JWT signature.
 * For verified user data, call `apiFetch('/api/users/me', { auth: true })`
 * via `lib/api-client.ts`.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const c = store.get(SESSION_COOKIE_NAME);
  if (!c) return null;
  return decodeJwtPayload(c.value);
}

/**
 * Same as `getSession` but throws `UnauthorizedError` instead of returning
 * `null`. Use when the calling code MUST have a session (protected route
 * handlers, requireUser-style guards in RSC).
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/**
 * Set the `matchday_session` cookie with the exact attributes from REQ-WB-2:
 *   `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`.
 *
 * Use ONLY from a route handler (POST /api/auth/login or /register).
 * Pass the raw upstream JWT — do NOT re-sign or transform.
 */
export async function setSessionCookie(jwt: string): Promise<void> {
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE_NAME,
    value: jwt,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * Clear the `matchday_session` cookie by writing an empty value with
 * `Max-Age=0` (REQ-WB-4). Use from `/api/auth/logout` AND defensively from
 * `/api/auth/me` and `/api/auth/login` when the upstream rejects the JWT.
 */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
