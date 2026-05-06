/**
 * Public-API fetch wrapper — server-only, no auth.
 *
 * Used by RSC pages (`/competiciones`, `/competiciones/[id]`) to call
 * public endpoints on the upstream API. Distinct from `lib/api-client.ts`:
 *   - No cookie read, no `Authorization` header.
 *   - Throws `PublicApiNotFoundError` on 404 (callers map to `notFound()`).
 *   - Throws `PublicApiNetworkError` on 5xx + network errors (callers
 *     render Spanish empty-state — see Scenario WP-S7).
 *   - Forwards Next 15's `next: { revalidate, tags }` ISR hint untouched.
 *
 * Why a separate wrapper? Conceptual clarity (public != BFF), AND
 * `api-client.ts` imports `server-only` + `cookies()` which we don't
 * need here. Smaller surface, fewer mocks per test.
 *
 * Returns the parsed JSON envelope as-is — callers unwrap `{ success,
 * data }` per endpoint.
 *
 * Defaults to `http://localhost:3000` to match `apps/api/src/server.ts`
 * PORT default (matches the BFF wrapper). Production sets
 * `API_BASE_URL=https://api.matchday.app` via Vercel env.
 */
import 'server-only';

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

function resolveApiBaseUrl(): string {
  const raw = process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL;
  return raw.replace(/\/+$/, '');
}

export class PublicApiNotFoundError extends Error {
  readonly status = 404;
  constructor(message = 'Recurso no encontrado en la API') {
    super(message);
    this.name = 'PublicApiNotFoundError';
  }
}

export class PublicApiNetworkError extends Error {
  readonly status?: number;
  override readonly cause?: unknown;
  constructor(message: string, opts: { status?: number; cause?: unknown } = {}) {
    super(message);
    this.name = 'PublicApiNetworkError';
    this.status = opts.status;
    this.cause = opts.cause;
  }
}

/**
 * Optional init for `publicApiFetch`. Extends `RequestInit` with:
 *   - `query`: record of values appended as a query string. `undefined`
 *     entries are skipped.
 *   - `next`: Next 15 ISR hint forwarded verbatim.
 */
export type PublicApiFetchInit = Omit<RequestInit, 'headers'> & {
  headers?: HeadersInit;
  query?: Record<string, string | number | boolean | undefined>;
  next?: { revalidate?: number | false; tags?: string[] };
};

function buildUrl(base: string, path: string, query: PublicApiFetchInit['query']): string {
  const url = `${base}${path}`;
  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs.length > 0 ? `${url}?${qs}` : url;
}

/**
 * GET (or other) a public endpoint on the upstream API server-side.
 *
 * @throws `PublicApiNotFoundError` on 404.
 * @throws `PublicApiNetworkError` on 5xx OR `fetch()` rejection.
 */
export async function publicApiFetch<T = unknown>(
  path: string,
  init: PublicApiFetchInit = {},
): Promise<T> {
  const { query, next, ...rest } = init;
  const base = resolveApiBaseUrl();
  const url = buildUrl(base, path, query);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      ...(next !== undefined ? { next } : {}),
    });
  } catch (err) {
    throw new PublicApiNetworkError('La API no respondió', { cause: err });
  }

  if (response.status === 404) {
    throw new PublicApiNotFoundError();
  }
  if (response.status >= 500) {
    throw new PublicApiNetworkError(`Upstream returned ${response.status}`, {
      status: response.status,
    });
  }
  if (!response.ok) {
    // 4xx other than 404 — surface as network error too; public pages
    // shouldn't be sending invalid requests.
    throw new PublicApiNetworkError(`Upstream returned ${response.status}`, {
      status: response.status,
    });
  }

  const text = await response.text();
  if (text.length === 0) {
    return null as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new PublicApiNetworkError('La API devolvió una respuesta no válida');
  }
}
