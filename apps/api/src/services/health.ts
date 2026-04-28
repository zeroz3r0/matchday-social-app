// ============================================================================
// Health Service
//
// `checkHealth` runs a fast DB liveness probe (`SELECT 1`) with a 100ms
// timeout race. The endpoint MUST never return 5xx — if the probe fails
// or times out, status degrades to `'degraded'` and `checks.database` is
// marked `'fail'`.
// ============================================================================

import { prisma } from '../utils/prisma';

const DB_CHECK_TIMEOUT_MS = 100;

export type DbCheckResult = 'ok' | 'fail';

export type HealthCheck = {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  version: string;
  checks: { database: DbCheckResult };
};

const TIMEOUT_SENTINEL: unique symbol = Symbol.for('matchday.health.timeout');

function dbProbe(): Promise<typeof TIMEOUT_SENTINEL | unknown> {
  return Promise.race([
    prisma.$queryRaw`SELECT 1`,
    new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
      setTimeout(() => resolve(TIMEOUT_SENTINEL), DB_CHECK_TIMEOUT_MS);
    }),
  ]);
}

export async function checkDatabase(): Promise<DbCheckResult> {
  try {
    const result = await dbProbe();
    if (result === TIMEOUT_SENTINEL) return 'fail';
    return 'ok';
  } catch {
    return 'fail';
  }
}

const VERSION = '0.1.0';

export async function checkHealth(): Promise<HealthCheck> {
  const database = await checkDatabase();
  const status: HealthCheck['status'] = database === 'ok' ? 'ok' : 'degraded';

  return {
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: VERSION,
    checks: { database },
  };
}
