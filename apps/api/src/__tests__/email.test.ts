// ============================================================================
// Email Service unit tests (EM-1 + EM-2)
//
// Coverage:
//   1. NODE_ENV=test → returns { id: 'test-noop' } without hitting Resend
//   2. Missing RESEND_API_KEY (non-test env) → graceful degrade, returns
//      { id: 'noop' } and DOES NOT call Resend (per design ADR #10)
//   3. Resend SDK rejects → rethrow + Sentry.captureException is called
//   4. Success path → returns { id: <resend-id> }
//
// NOTE: The orchestrator brief mentioned "throws on missing key in non-test
// env", but design ADR #10 + Phase B implementation lock the graceful-degrade
// path (warn + noop). Tests assert the LOCKED behavior; the brief reads as a
// stale spec.
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.hoisted runs before the (also hoisted) vi.mock factories, so the
// closures can safely reference these spies.
const { mockSend, mockCaptureException } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockCaptureException: vi.fn(),
}));

// Mock Resend SDK BEFORE importing email.ts so the lazy client picks the mock.
// Use a real class so `new Resend(apiKey)` works inside email.ts:getClient.
vi.mock('resend', () => ({
  Resend: class MockResend {
    public emails = { send: mockSend };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_apiKey: string) {}
  },
}));

// Mock Sentry to spy on captureException.
vi.mock('../lib/sentry', () => ({
  Sentry: {
    captureException: mockCaptureException,
  },
}));

// Mock logger so test output stays clean and we don't depend on Pino.
vi.mock('../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { sendEmail, __resetEmailClientForTests } from '../services/email';

const ORIGINAL_NODE_ENV = process.env['NODE_ENV'];
const ORIGINAL_API_KEY = process.env['RESEND_API_KEY'];
const ORIGINAL_FROM = process.env['RESEND_FROM_EMAIL'];

beforeEach(() => {
  vi.clearAllMocks();
  __resetEmailClientForTests();
});

afterEach(() => {
  // Restore env to whatever vitest normally sets.
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env['NODE_ENV'];
  } else {
    process.env['NODE_ENV'] = ORIGINAL_NODE_ENV;
  }
  if (ORIGINAL_API_KEY === undefined) {
    delete process.env['RESEND_API_KEY'];
  } else {
    process.env['RESEND_API_KEY'] = ORIGINAL_API_KEY;
  }
  if (ORIGINAL_FROM === undefined) {
    delete process.env['RESEND_FROM_EMAIL'];
  } else {
    process.env['RESEND_FROM_EMAIL'] = ORIGINAL_FROM;
  }
});

describe('sendEmail', () => {
  it('EM-1 NODE_ENV=test → returns { id: "test-noop" } without hitting Resend', async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['RESEND_API_KEY'] = 'fake-key-should-not-be-used';

    const result = await sendEmail({
      to: 'someone@example.com',
      subject: 'hello',
      html: '<p>hi</p>',
    });

    expect(result).toEqual({ id: 'test-noop' });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('EM-1 missing RESEND_API_KEY (non-test env) → graceful noop, no Resend call', async () => {
    process.env['NODE_ENV'] = 'production';
    delete process.env['RESEND_API_KEY'];

    const result = await sendEmail({
      to: 'someone@example.com',
      subject: 'hello',
      html: '<p>hi</p>',
    });

    expect(result).toEqual({ id: 'noop' });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('EM-1 Resend rejects → rethrow + Sentry.captureException called', async () => {
    process.env['NODE_ENV'] = 'production';
    process.env['RESEND_API_KEY'] = 're_fake_key';
    process.env['RESEND_FROM_EMAIL'] = 'noreply@matchday.app';

    const boom = new Error('Resend network failure');
    mockSend.mockRejectedValueOnce(boom);

    await expect(
      sendEmail({
        to: 'someone@example.com',
        subject: 'hello',
        html: '<p>hi</p>',
      }),
    ).rejects.toThrow('Resend network failure');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(boom);
  });

  it('EM-2 success path → returns { id: <resend-id> } with from from env', async () => {
    process.env['NODE_ENV'] = 'production';
    process.env['RESEND_API_KEY'] = 're_fake_key';
    process.env['RESEND_FROM_EMAIL'] = 'noreply@matchday.app';

    mockSend.mockResolvedValueOnce({
      data: { id: 'resend-msg-abc123' },
      error: null,
    });

    const result = await sendEmail({
      to: 'lionel@example.com',
      subject: 'Restablece tu contraseña',
      html: '<p>Hola</p>',
    });

    expect(result).toEqual({ id: 'resend-msg-abc123' });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@matchday.app',
      to: 'lionel@example.com',
      subject: 'Restablece tu contraseña',
      html: '<p>Hola</p>',
    });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });
});
