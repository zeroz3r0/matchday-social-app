// ============================================================================
// Sentry Node Initialization
//
// No-op when `SENTRY_DSN` is empty (REQ-BS-1). Must be called at the very top
// of `app.ts` before any middleware so `Sentry.Handlers.requestHandler()` and
// `Sentry.Handlers.errorHandler()` are available to mount.
// ============================================================================

import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): void {
  const dsn = process.env['SENTRY_DSN'];
  if (!dsn) {
    // Silent no-op — REQ-BS-1 scenario "Missing DSN no-op"
    return;
  }
  if (initialized) return;

  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] || 'development',
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.5 : 1.0,
  });
  initialized = true;
}

export { Sentry };
