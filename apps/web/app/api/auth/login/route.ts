/**
 * BFF route: POST /api/auth/login
 *
 * Spec: REQ-WB-1, REQ-WB-2, REQ-WB-3, REQ-WB-7, REQ-WB-9.
 * Scenarios: WB-S1 (happy), WB-S5 (wrong password), WB-S7 (malformed body),
 *            WB-S8 (upstream 5xx).
 *
 * Flow:
 *   1. Parse JSON safely → 400 INVALID_BODY on parse failure.
 *   2. Validate against `loginSchema` → 400 VALIDATION_ERROR with issues[].
 *   3. Forward to upstream `${API_BASE_URL}/api/auth/login`.
 *   4. On 200: extract `data.token`, call `setSessionCookie`, return
 *      `{ user }` (NO token in body — cookie is the truth).
 *   5. On 401: return Spanish error, NO cookie set.
 *   6. On 5xx / network: return 502 + Spanish, NO cookie change.
 *
 * Spanish error copy comes from `lib/errors.ts`.
 */
import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/schemas/auth';
import { setSessionCookie } from '@/lib/auth';
import {
  apiFetch,
  ApiNetworkError,
  ApiUnauthorizedError,
  ApiValidationError,
} from '@/lib/api-client';
import { getSpanishErrorMessage } from '@/lib/errors';

type UpstreamLoginResponse = {
  success: true;
  data: {
    user: { id: string; email: string; nickname: string; [k: string]: unknown };
    token: string;
  };
  meta?: { deleted: true; deletedAt: string };
};

export async function POST(req: Request): Promise<Response> {
  // 1. Parse body safely.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: getSpanishErrorMessage('INVALID_BODY') }, { status: 400 });
  }

  // 2. Validate.
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: getSpanishErrorMessage('VALIDATION_ERROR'),
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  // 3. Forward to upstream.
  let upstream: UpstreamLoginResponse;
  try {
    upstream = await apiFetch<UpstreamLoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    if (err instanceof ApiUnauthorizedError) {
      return NextResponse.json(
        { error: getSpanishErrorMessage('INVALID_CREDENTIALS') },
        { status: 401 },
      );
    }
    if (err instanceof ApiValidationError) {
      // Surface upstream's error code as Spanish if possible.
      const code = extractCode(err.body);
      return NextResponse.json(
        {
          error: getSpanishErrorMessage(code ?? err.status),
          issues: extractIssues(err.body),
        },
        { status: err.status },
      );
    }
    if (err instanceof ApiNetworkError) {
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

  // 4. Success — set cookie, return user.
  await setSessionCookie(upstream.data.token);
  return NextResponse.json({ user: upstream.data.user }, { status: 200 });
}

function extractCode(body: unknown): string | null {
  if (
    body !== null &&
    typeof body === 'object' &&
    'error' in body &&
    typeof (body as { error: unknown }).error === 'object' &&
    (body as { error: { code?: unknown } }).error !== null &&
    typeof (body as { error: { code?: unknown } }).error.code === 'string'
  ) {
    return (body as { error: { code: string } }).error.code;
  }
  return null;
}

function extractIssues(body: unknown): unknown {
  if (
    body !== null &&
    typeof body === 'object' &&
    'error' in body &&
    typeof (body as { error: unknown }).error === 'object' &&
    (body as { error: { issues?: unknown } }).error !== null &&
    'issues' in (body as { error: object }).error
  ) {
    return (body as { error: { issues: unknown } }).error.issues;
  }
  return undefined;
}
