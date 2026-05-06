/**
 * BFF route: POST /api/auth/register
 *
 * Spec: REQ-WB-1, REQ-WB-2, REQ-WB-3, REQ-WB-7, REQ-WB-9.
 * Scenarios: WB-S2 (happy 201 + cookie), WB-S7, WB-S8.
 *
 * Mirrors `/login` flow but:
 *   - Uses `registerSchema` (broader: email, password, nickname, position,
 *     bio?, avatarUrl?, latitude?, longitude?, city?, ToS/Privacy versions).
 *   - Returns 201 on success.
 *   - Surfaces 409 EMAIL_TAKEN as Spanish "Este correo ya está registrado.".
 *
 * Same Spanish error mapping + cookie discipline as login.
 */
import { NextResponse } from 'next/server';
import { registerSchema } from '@/lib/schemas/auth';
import { setSessionCookie } from '@/lib/auth';
import { apiFetch, ApiNetworkError, ApiUnauthorizedError, ApiValidationError } from '@/lib/api-client';
import { getSpanishErrorMessage } from '@/lib/errors';

type UpstreamRegisterResponse = {
  success: true;
  data: {
    user: { id: string; email: string; nickname: string; [k: string]: unknown };
    token: string;
  };
};

export async function POST(req: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: getSpanishErrorMessage('INVALID_BODY') },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: getSpanishErrorMessage('VALIDATION_ERROR'),
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  let upstream: UpstreamRegisterResponse;
  try {
    upstream = await apiFetch<UpstreamRegisterResponse>('/api/auth/register', {
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

  await setSessionCookie(upstream.data.token);
  return NextResponse.json({ user: upstream.data.user }, { status: 201 });
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
