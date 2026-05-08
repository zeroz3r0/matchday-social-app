/**
 * RED — tests for `lib/api-public.ts`.
 *
 * Spec: REQ-WP-2, REQ-WP-3 (public pages call the API server-side).
 *
 * Contract:
 *   - Reads `process.env.API_BASE_URL` (default `http://localhost:3000`).
 *   - Trims trailing slash from base URL (defensive).
 *   - DOES NOT attach Authorization (this is the PUBLIC client).
 *   - Returns parsed JSON envelope as-is on 2xx (caller unwraps).
 *   - Throws `PublicApiNotFoundError` on 404 → callers map to `notFound()`.
 *   - Throws `PublicApiNetworkError` on 5xx OR fetch() rejection → callers
 *     render Spanish empty-state.
 *   - Forwards `next: { revalidate }` ISR hint when caller passes it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { publicApiFetch, PublicApiNotFoundError, PublicApiNetworkError } from '@/lib/api-public';

const ORIGINAL_ENV = process.env.API_BASE_URL;

afterEach(() => {
  process.env.API_BASE_URL = ORIGINAL_ENV;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('publicApiFetch', () => {
  it('hits API_BASE_URL + path on 200 and returns parsed JSON envelope', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [{ id: 'cmp_1' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await publicApiFetch<{ success: true; data: unknown }>('/api/competitions');

    expect(result).toEqual({ success: true, data: [{ id: 'cmp_1' }] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.matchday.app/api/competitions');
    // No Authorization header on PUBLIC client.
    const headers = new Headers((calledInit as RequestInit)?.headers);
    expect(headers.get('authorization')).toBeNull();
  });

  it('falls back to http://localhost:3000 when env var is unset', async () => {
    delete process.env.API_BASE_URL;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"success":true,"data":[]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await publicApiFetch('/api/competitions');

    const [calledUrl] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('http://localhost:3000/api/competitions');
  });

  it('trims trailing slashes from API_BASE_URL', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app///';
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"success":true,"data":{"id":"cmp_1"}}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await publicApiFetch('/api/competitions/cmp_1');

    const [calledUrl] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.matchday.app/api/competitions/cmp_1');
  });

  it('forwards { next: { revalidate } } ISR hint to fetch', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"success":true,"data":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await publicApiFetch('/api/competitions', { next: { revalidate: 60 } });

    const [, calledInit] = fetchMock.mock.calls[0]!;
    expect((calledInit as { next?: { revalidate?: number } }).next).toEqual({
      revalidate: 60,
    });
  });

  it('throws PublicApiNotFoundError on 404', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"success":false,"error":{"code":"NOT_FOUND"}}', {
          status: 404,
        }),
      ),
    );

    await expect(publicApiFetch('/api/competitions/missing')).rejects.toBeInstanceOf(
      PublicApiNotFoundError,
    );
  });

  it('throws PublicApiNetworkError on 500', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));

    await expect(publicApiFetch('/api/competitions')).rejects.toBeInstanceOf(PublicApiNetworkError);
  });

  it('throws PublicApiNetworkError when fetch() itself rejects', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(publicApiFetch('/api/competitions')).rejects.toBeInstanceOf(PublicApiNetworkError);
  });

  it('appends query string when params are provided', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"success":true,"data":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await publicApiFetch('/api/competitions', {
      query: { city: 'Madrid', type: 'LEAGUE' },
    });

    const [calledUrl] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.matchday.app/api/competitions?city=Madrid&type=LEAGUE');
  });

  it('skips undefined query values without serialising them', async () => {
    process.env.API_BASE_URL = 'https://api.matchday.app';
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"success":true,"data":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await publicApiFetch('/api/competitions', {
      query: { city: 'Madrid', type: undefined, gameType: 'F7' },
    });

    const [calledUrl] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.matchday.app/api/competitions?city=Madrid&gameType=F7');
  });
});
