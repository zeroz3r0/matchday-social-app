// ============================================================================
// Push Notifications Service — Expo Push API wrapper
//
// Mirrors the `email.ts` pattern: lazy/graceful, `NODE_ENV==='test'` no-op,
// Sentry-on-failure, structured pino logging. Uses native `fetch` (Node 18+)
// against `https://exp.host/--/api/v2/push/send` — no extra SDK dependency.
//
// Behavior:
//   - sendToUser(userId, payload, prisma) → fetches user's PushTokens and
//     dispatches one Expo Push request per BATCH_SIZE (100) tokens.
//   - sendToUsers(userIds[], payload, prisma) → same, scoped to a list of
//     userIds (e.g. all confirmed players for a match).
//   - Receipts with `details.error === 'DeviceNotRegistered'` cause the
//     PushToken row to be hard-deleted (token unrecoverable).
//   - Other receipt errors are logged + captured to Sentry; we never throw
//     to the caller (REQ Trigger Resilience — push failure MUST NOT block
//     the originating request).
//   - Network/HTTP errors are also logged + captured; the whole batch is
//     counted as `failed`.
//   - `NODE_ENV==='test'` short-circuits before any DB or fetch work — keeps
//     vitest hermetic.
// ============================================================================

import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { Sentry } from '../lib/sentry';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

export interface PushPayload {
  title: string;
  body: string;
  data?: { route?: string; params?: Record<string, unknown> };
}

export interface PushResult {
  sent: number;
  failed: number;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
  priority: 'high';
}

interface ExpoPushReceipt {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

// Narrow shape we actually use from the prisma client — keeps the tests'
// in-memory mock satisfiable without exposing the full PrismaClient type.
type PushTokenClient = {
  pushToken: {
    findMany: (args: {
      where: { userId: string | { in: string[] } };
      select?: { token: true };
    }) => Promise<Array<{ token: string }>>;
    deleteMany: (args: { where: { token: string } }) => Promise<{ count: number }>;
  };
};

function asPushClient(prisma: PrismaClient): PushTokenClient {
  return prisma as unknown as PushTokenClient;
}

export async function sendToUser(
  userId: string,
  payload: PushPayload,
  prisma: PrismaClient,
): Promise<PushResult> {
  if (process.env['NODE_ENV'] === 'test') {
    return { sent: 0, failed: 0 };
  }

  const client = asPushClient(prisma);
  const rows = await client.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (rows.length === 0) {
    return { sent: 0, failed: 0 };
  }

  return sendToTokens(
    rows.map((r) => r.token),
    payload,
    client,
  );
}

export async function sendToUsers(
  userIds: string[],
  payload: PushPayload,
  prisma: PrismaClient,
): Promise<PushResult> {
  if (process.env['NODE_ENV'] === 'test') {
    return { sent: 0, failed: 0 };
  }
  if (userIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const client = asPushClient(prisma);
  const rows = await client.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });
  if (rows.length === 0) {
    return { sent: 0, failed: 0 };
  }

  return sendToTokens(
    rows.map((r) => r.token),
    payload,
    client,
  );
}

async function sendToTokens(
  tokens: string[],
  payload: PushPayload,
  client: PushTokenClient,
): Promise<PushResult> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const messages: ExpoPushMessage[] = batch.map((to) => {
      const msg: ExpoPushMessage = {
        to,
        title: payload.title,
        body: payload.body,
        sound: 'default',
        priority: 'high',
      };
      if (payload.data !== undefined) {
        msg.data = payload.data as Record<string, unknown>;
      }
      return msg;
    });

    try {
      const response = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        logger.error({ status: response.status, batchSize: batch.length }, 'expo_push_http_error');
        Sentry.captureException(new Error(`Expo Push HTTP ${response.status}`));
        failed += batch.length;
        continue;
      }

      const json = (await response.json()) as { data?: ExpoPushReceipt[] };
      const receipts = Array.isArray(json.data) ? json.data : [];

      // Malformed payload — Expo always returns `data: receipts[]`. Treat
      // the whole batch as failed, but don't throw.
      if (receipts.length === 0) {
        logger.warn({ batchSize: batch.length }, 'expo_push_receipts_missing');
        failed += batch.length;
        continue;
      }

      for (let j = 0; j < receipts.length; j += 1) {
        const receipt = receipts[j];
        const token = batch[j];
        if (receipt?.status === 'ok') {
          sent += 1;
          continue;
        }
        failed += 1;
        const errKind = receipt?.details?.error;
        if (errKind === 'DeviceNotRegistered' && token) {
          await client.pushToken.deleteMany({ where: { token } });
          logger.info(
            { tokenPrefix: token.slice(0, 16) },
            'expo_push_token_removed_device_not_registered',
          );
        } else {
          logger.error({ receipt }, 'expo_push_receipt_error');
          Sentry.captureException(
            new Error(`Expo receipt error: ${receipt?.message ?? 'unknown'}`),
          );
        }
      }
    } catch (err) {
      logger.error({ err, batchSize: batch.length }, 'expo_push_fetch_failed');
      Sentry.captureException(err);
      failed += batch.length;
    }
  }

  return { sent, failed };
}
