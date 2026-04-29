// ============================================================================
// pushNotifications service — Expo Push API wrapper
//
// Strict TDD coverage (RED first, GREEN after impl in services/pushNotifications.ts):
//   C.1   NODE_ENV='test' → no fetch, returns {sent:0, failed:0}
//   C.2   sendToUser w/ 1 token → fetch called once with ExpoPushMessage[]
//   C.3   sendToUser w/ 0 tokens → no fetch, {sent:0, failed:0}
//   C.4   DeviceNotRegistered receipt → PushToken row deleted
//   C.5   other receipt error → Sentry.captureException invoked, no throw
//   C.6   sendToUsers 250 tokens → 3 fetch batches (100, 100, 50)
//   C.7   malformed receipt payload → graceful, no crash
//
// Strategy: NODE_ENV is forced to a non-test value INSIDE every test that
// must hit the network path (so we exercise the real fetch branch). The C.1
// test explicitly pins NODE_ENV='test' to verify the no-op guard.
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Sentry capture so we can assert on it without a real DSN.
vi.mock('../lib/sentry', () => ({
  Sentry: {
    captureException: vi.fn(),
  },
  initSentry: vi.fn(),
}));

import { Sentry } from '../lib/sentry';
import {
  sendToUser,
  sendToUsers,
  type PushPayload,
} from '../services/pushNotifications';

// In-memory prisma mock — only the methods this service uses.
function makePrismaMock(opts: {
  tokensFor?: Record<string, Array<{ token: string }>>;
  tokensForMany?: Array<{ token: string }>;
}): unknown {
  return {
    pushToken: {
      findMany: vi.fn((arg: { where: { userId?: string; userId_in?: { in: string[] } } }) => {
        // Two query shapes — single user OR userId in [...]
        const where = (arg as { where: { userId?: string | { in: string[] } } }).where;
        const w = where.userId;
        if (typeof w === 'string') {
          return Promise.resolve(opts.tokensFor?.[w] ?? []);
        }
        if (w && typeof w === 'object' && Array.isArray(w.in)) {
          return Promise.resolve(opts.tokensForMany ?? []);
        }
        return Promise.resolve([]);
      }),
      deleteMany: vi.fn(() => Promise.resolve({ count: 1 })),
    },
  };
}

const PAYLOAD: PushPayload = {
  title: 'Hola',
  body: 'cuerpo',
  data: { route: 'MatchDetail', params: { matchId: 'm1' } },
};

const ORIG_NODE_ENV = process.env['NODE_ENV'];

beforeEach(() => {
  vi.clearAllMocks();
  // Default: production-like so fetch path runs. Individual tests override.
  process.env['NODE_ENV'] = 'development';
});

afterEach(() => {
  process.env['NODE_ENV'] = ORIG_NODE_ENV;
  vi.restoreAllMocks();
});

// ─── C.1 ────────────────────────────────────────────────────────────────────

describe('sendToUser — NODE_ENV=test no-op', () => {
  it('returns {sent:0, failed:0} and never calls fetch', async () => {
    process.env['NODE_ENV'] = 'test';
    const fetchSpy = vi.spyOn(global, 'fetch');
    const prisma = makePrismaMock({ tokensFor: { lionel: [{ token: 'tok-1' }] } });

    const result = await sendToUser('lionel', PAYLOAD, prisma as never);

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─── C.2 ────────────────────────────────────────────────────────────────────

describe('sendToUser — single token happy path', () => {
  it('calls fetch once with Expo URL + ExpoPushMessage[] containing payload', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ status: 'ok', id: 'rcpt-1' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const prisma = makePrismaMock({ tokensFor: { lionel: [{ token: 'ExponentPushToken[abc]' }] } });

    const result = await sendToUser('lionel', PAYLOAD, prisma as never);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    const reqInit = init as RequestInit;
    expect(reqInit.method).toBe('POST');
    const body = JSON.parse(reqInit.body as string) as Array<{
      to: string;
      title: string;
      body: string;
      data?: unknown;
      sound?: string;
      priority?: string;
    }>;
    expect(body).toHaveLength(1);
    expect(body[0]!.to).toBe('ExponentPushToken[abc]');
    expect(body[0]!.title).toBe('Hola');
    expect(body[0]!.body).toBe('cuerpo');
    expect(body[0]!.data).toEqual({ route: 'MatchDetail', params: { matchId: 'm1' } });
    expect(body[0]!.sound).toBe('default');
    expect(body[0]!.priority).toBe('high');

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });
});

// ─── C.3 ────────────────────────────────────────────────────────────────────

describe('sendToUser — zero tokens', () => {
  it('does NOT call fetch and returns {sent:0, failed:0}', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const prisma = makePrismaMock({ tokensFor: { bob: [] } });

    const result = await sendToUser('bob', PAYLOAD, prisma as never);

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─── C.4 ────────────────────────────────────────────────────────────────────

describe('sendToUser — DeviceNotRegistered cleanup', () => {
  it('deletes the PushToken row when receipt error is DeviceNotRegistered', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              status: 'error',
              message: 'The recipient device is not registered',
              details: { error: 'DeviceNotRegistered' },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const prisma = makePrismaMock({ tokensFor: { lionel: [{ token: 'stale-1' }] } });

    const result = await sendToUser('lionel', PAYLOAD, prisma as never);

    expect((prisma as { pushToken: { deleteMany: ReturnType<typeof vi.fn> } }).pushToken.deleteMany)
      .toHaveBeenCalledTimes(1);
    const arg = (
      prisma as { pushToken: { deleteMany: ReturnType<typeof vi.fn> } }
    ).pushToken.deleteMany.mock.calls[0]![0] as { where: { token: string } };
    expect(arg.where.token).toBe('stale-1');
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });
});

// ─── C.5 ────────────────────────────────────────────────────────────────────

describe('sendToUser — other receipt error → Sentry', () => {
  it('captures the error in Sentry and does NOT throw', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              status: 'error',
              message: 'Message too big',
              details: { error: 'MessageTooBig' },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const prisma = makePrismaMock({ tokensFor: { lionel: [{ token: 'tok-big' }] } });

    const result = await sendToUser('lionel', PAYLOAD, prisma as never);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(
      (prisma as { pushToken: { deleteMany: ReturnType<typeof vi.fn> } }).pushToken.deleteMany,
    ).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });
});

// ─── C.6 ────────────────────────────────────────────────────────────────────

describe('sendToUsers — 250 tokens batched at 100', () => {
  it('issues 3 sequential fetch calls (100, 100, 50)', async () => {
    const tokensForMany = Array.from({ length: 250 }, (_, i) => ({ token: `tok-${i}` }));
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string) as unknown[];
      const data = body.map(() => ({ status: 'ok', id: 'r' }));
      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const prisma = makePrismaMock({ tokensForMany });

    const result = await sendToUsers(['u1', 'u2', 'u3'], PAYLOAD, prisma as never);

    expect(fetchSpy).toHaveBeenCalledTimes(3);

    const sizes = fetchSpy.mock.calls.map((c) => {
      const init = c[1] as RequestInit;
      const body = JSON.parse(init.body as string) as unknown[];
      return body.length;
    });
    expect(sizes).toEqual([100, 100, 50]);
    expect(result.sent).toBe(250);
    expect(result.failed).toBe(0);
  });
});

// ─── C.7 ────────────────────────────────────────────────────────────────────

describe('sendToUser — malformed receipt payload', () => {
  it('does not crash and counts the batch as failed', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ unexpected: 'shape' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const prisma = makePrismaMock({ tokensFor: { lionel: [{ token: 'tok-1' }] } });

    const result = await sendToUser('lionel', PAYLOAD, prisma as never);

    // No receipts parsed → sent 0, failed 1 (batch size).
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('captures Sentry on fetch network failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNRESET'));
    const prisma = makePrismaMock({ tokensFor: { lionel: [{ token: 'tok-1' }] } });

    const result = await sendToUser('lionel', PAYLOAD, prisma as never);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });
});
