// ============================================================================
// Email Service (MINIMAL Resend wrapper)
//
// EM-1: `sendEmail({ to, subject, html })` wraps the Resend SDK.
//   - `from` comes from `RESEND_FROM_EMAIL` env (default `onboarding@resend.dev`).
//   - `RESEND_API_KEY` missing → log warn + return `{ id: 'noop' }` (graceful
//     degrade — caller path keeps working in dev/CI without a real Resend key).
//   - `NODE_ENV === 'test'` → no-op return `{ id: 'test-noop' }` so vitest
//     never hits Resend.
//   - Resend reject → `Sentry.captureException` + rethrow (caller decides).
//
// Lazy-init the Resend client on first call so a missing key doesn't crash
// at import time.
// ============================================================================
import { Resend } from 'resend';
import { logger } from '../utils/logger';
import { Sentry } from '../lib/sentry';

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult = { id: string };

const DEFAULT_FROM = 'onboarding@resend.dev';

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) return null;
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

// Test hook — used by unit tests to reset the lazy singleton between cases.
export function __resetEmailClientForTests(): void {
  cachedClient = null;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const { to, subject, html } = args;

  // Test guard: never hit Resend from vitest.
  if (process.env['NODE_ENV'] === 'test') {
    return { id: 'test-noop' };
  }

  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) {
    logger.warn(
      { to, subject },
      'email_send_skipped_missing_api_key',
    );
    return { id: 'noop' };
  }

  const client = getClient();
  if (!client) {
    // Defensive — getClient already covers the missing-key path above.
    logger.warn({ to, subject }, 'email_send_skipped_no_client');
    return { id: 'noop' };
  }

  const from = process.env['RESEND_FROM_EMAIL'] ?? DEFAULT_FROM;

  try {
    const result = await client.emails.send({ from, to, subject, html });
    if (result.error) {
      logger.error({ err: result.error, to, subject }, 'email_send_failed');
      Sentry.captureException(result.error);
      throw result.error;
    }
    const id = result.data?.id ?? 'unknown';
    logger.info({ to, subject, id }, 'email_sent');
    return { id };
  } catch (err) {
    logger.error({ err, to, subject }, 'email_send_threw');
    Sentry.captureException(err);
    throw err;
  }
}
