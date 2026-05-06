/**
 * Server-to-server fetch wrapper for the upstream Matchday API.
 *
 * Design decisions (orchestrator brief + design §3):
 * - Reads `process.env.API_BASE_URL ?? 'http://localhost:3000'`. Trailing
 *   slash is trimmed defensively so callers can pass paths starting with `/`
 *   without producing `//api/...`.
 * - When `auth: true`, reads the `matchday_session` cookie via
 *   `next/headers` and adds `Authorization: Bearer <jwt>`. The JWT goes
 *   verbatim — the API does the verification.
 * - Throws TYPED errors so route handlers can map to the right HTTP status:
 *     - `ApiUnauthorizedError` on 401
 *     - `ApiValidationError` on 400 (body attached for caller)
 *     - `ApiNetworkError` on 5xx OR when `fetch()` itself rejects
 *   2xx responses return the parsed JSON body as-is (callers decide whether
 *   to unwrap the `{ success, data }` envelope).
 * - PURE w.r.t. cookies: this module READS the session cookie but never
 *   sets or clears it. Cookie mutation is the route handler's job — that
 *   keeps `apiFetch` reusable from RSC pages where cookie writes are
 *   forbidden.
 *
 * NOTE: orchestrator's brief mentions a default of `http://localhost:3001`,
 * but `apps/api` actually listens on port 3000 (see
 * `apps/api/src/server.ts:9`). 3001 is the WEB dev port. Default here is
 * therefore 3000. `.env.example` documents the full picture.
 *
 * Phase 2 deploy will set `API_BASE_URL=https://api.matchday.app` in the
 * Vercel project env. Nothing else changes.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

function resolveApiBaseUrl(): string {
  const raw = process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL;
  return raw.replace(/\/+$/, '');
}

export class ApiNetworkError extends Error {
  readonly status?: number;
  override readonly cause?: unknown;
  constructor(message: string, opts: { status?: number; cause?: unknown } = {}) {
    super(message);
    this.name = 'ApiNetworkError';
    this.status = opts.status;
    this.cause = opts.cause;
  }
}

export class ApiUnauthorizedError extends Error {
  readonly status = 401;
  readonly body: unknown;
  constructor(body: unknown) {
    super('Upstream rejected authentication');
    this.name = 'ApiUnauthorizedError';
    this.body = body;
  }
}

export class ApiValidationError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    super('Upstream rejected the request body');
    this.name = 'ApiValidationError';
    this.status = status;
    this.body = body;
  }
}

export type ApiFetchInit = RequestInit & {
  /** When true, attach `Authorization: Bearer <jwt>` from the session cookie. */
  auth?: boolean;
};

/**
 * Fetch a path on the upstream API with optional Bearer auth.
 *
 * @param path - Path starting with `/` (e.g. `/api/users/me`).
 * @param init - Standard fetch init plus `{ auth?: boolean }`.
 * @returns Parsed JSON body on 2xx.
 * @throws `ApiUnauthorizedError` on 401, `ApiValidationError` on 400,
 *         `ApiNetworkError` on 5xx or fetch failure.
 */
export async function apiFetch<T = unknown>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const { auth, headers: rawHeaders, ...rest } = init;
  const url = `${resolveApiBaseUrl()}${path}`;
  const headers = new Headers(rawHeaders);

  if (!headers.has('content-type') && rest.body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  if (auth) {
    const store = await cookies();
    const c = store.get(SESSION_COOKIE_NAME);
    if (c?.value) {
      headers.set('authorization', `Bearer ${c.value}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { ...rest, headers });
  } catch (err) {
    throw new ApiNetworkError('La API no respondió', { cause: err });
  }

  // Try to parse the body once — works for both success and error envelopes.
  let body: unknown = null;
  const text = await response.text();
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (response.ok) {
    return body as T;
  }

  if (response.status === 401) {
    throw new ApiUnauthorizedError(body);
  }
  if (response.status >= 400 && response.status < 500) {
    throw new ApiValidationError(response.status, body);
  }
  throw new ApiNetworkError(`Upstream returned ${response.status}`, {
    status: response.status,
    cause: body,
  });
}
