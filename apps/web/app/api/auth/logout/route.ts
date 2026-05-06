/**
 * BFF route: POST /api/auth/logout
 *
 * Spec: REQ-WB-4 (cookie clear). Per orchestrator brief, returns 200 +
 * `{ ok: true }` (overriding spec's earlier 204 decision — body lets clients
 * confirm the operation without inspecting status alone).
 *
 * NO upstream call: the API does not expose a logout endpoint; the JWT
 * stays valid until expiry. This is acceptable for Sprint 2 — future
 * `auth-refresh` change adds server-side token revocation.
 */
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST(): Promise<Response> {
  await clearSessionCookie();
  return NextResponse.json({ ok: true }, { status: 200 });
}
