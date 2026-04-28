import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Writable } from 'node:stream';
import pino from 'pino';

describe('logger redaction', () => {
  let chunks: string[];
  let stream: Writable;

  beforeEach(() => {
    chunks = [];
    stream = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk.toString('utf8'));
        cb();
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts req.body.password as [Redacted]', async () => {
    // Force the logger module to use our capture stream by mocking pino destination
    // Logger config under test must apply redact paths.
    const { buildLogger } = await import('../utils/logger');
    const logger = buildLogger({ destination: stream });

    logger.info(
      {
        req: {
          body: { email: 'a@b.com', password: 'super-secret' },
          headers: {},
        },
      },
      'login attempt',
    );

    const output = chunks.join('');
    expect(output).not.toContain('super-secret');
    expect(output).toContain('[Redacted]');
  });

  it('redacts Authorization header', async () => {
    const { buildLogger } = await import('../utils/logger');
    const logger = buildLogger({ destination: stream });

    logger.info(
      {
        req: {
          body: {},
          headers: { authorization: 'Bearer top-secret-token' },
        },
      },
      'authorized request',
    );

    const output = chunks.join('');
    expect(output).not.toContain('top-secret-token');
    expect(output).toContain('[Redacted]');
  });

  it('redacts req.body.passwordHash', async () => {
    const { buildLogger } = await import('../utils/logger');
    const logger = buildLogger({ destination: stream });

    logger.info(
      {
        req: {
          body: { passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz' },
          headers: {},
        },
      },
      'user record',
    );

    const output = chunks.join('');
    expect(output).not.toContain('$2b$10$abcdefghijklmnopqrstuvwxyz');
    expect(output).toContain('[Redacted]');
  });

  it('does not mount pino-http when NODE_ENV=test (smoke: logger module exports work in test mode)', async () => {
    // Sanity check: logger module is importable in test env without throwing.
    const mod = await import('../utils/logger');
    expect(mod.logger).toBeDefined();
    expect(typeof mod.buildLogger).toBe('function');
  });

  // Ensure pino is the underlying impl (sanity)
  it('pino module is available', () => {
    expect(typeof pino).toBe('function');
  });
});
