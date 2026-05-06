/**
 * BFF route: GET /api/auth/me
 *
 * Spec: REQ-WB-1, REQ-WB-5, REQ-WB-7, REQ-WB-8.
 * Scenarios: WB-S3 (200 valid cookie), WB-S6 (tampered → 401 + clear).
 *
 * Flow:
 *   1. `getSession()` reads cookie + decodes JWT (NO verify).
 *      - Absent or malformed → 401 + clear cookie defensively.
 *   2. Forward to upstream `GET /api/users/me` with Bearer JWT.
 *      - 200 → return upstream user as `{ user }`.
 *      - 401 (JWT invalid/expired upstream) → 401 + clear cookie.
 *      - 5xx → 502 + Spanish; DO NOT touch cookie (per REQ-WB-7 — preserve
 *        session through transient upstream blips).
 *
 * Endpoint verified: `apps/api/src/routes/users.ts:30` exposes `GET /me`
 * (mounted under `/api/users` in `apps/api/src/app.ts`).
 */
import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth';
import {
  apiFetch,
  ApiNetworkError,
  ApiUnauthorizedError,
  ApiValidationError,
} from '@/lib/api-client';
import { getSpanishErrorMessage } from '@/lib/errors';

type UpstreamMeResponse = {
  success: true;
  data: {
    id: string;
    email: string;
    nickname: string;
    [k: string]: unknown;
  };
};

export async function GET(_req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    await clearSessionCookie();
    return NextResponse.json(
      { error: getSpanishErrorMessage('INVALID_CREDENTIALS') },
      { status: 401 },
    );
  }

  let upstream: UpstreamMeResponse;
  try {
    upstream = await apiFetch<UpstreamMeResponse>('/api/users/me', { auth: true });
  } catch (err) {
    if (err instanceof ApiUnauthorizedError) {
      await clearSessionCookie();
      return NextResponse.json(
        { error: getSpanishErrorMessage('INVALID_CREDENTIALS') },
        { status: 401 },
      );
    }
    if (err instanceof ApiValidationError) {
      // Treat unexpected 4xx as upstream-rejected; clear cookie defensively.
      await clearSessionCookie();
      return NextResponse.json({ error: getSpanishErrorMessage(err.status) }, { status: 401 });
    }
    if (err instanceof ApiNetworkError) {
      // REQ-WB-7: 5xx → 502, NO cookie change.
      return NextResponse.json(
        { error: getSpanishErrorMessage('SERVICE_UNAVAILABLE') },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: getSpanishErrorMessage('SERVICE_UNAVAILABLE') },
      { status: 502 },
    );
  }

  return NextResponse.json({ user: upstream.data }, { status: 200 });
}
