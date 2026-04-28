// ============================================================================
// Pino Logger
//
// JSON in production, `pino-pretty` in development. NOT mounted in test
// (test suite runs through morgan-skip pattern + `pino-http` is gated in
// `app.ts`). Sensitive fields are redacted via Pino's built-in redaction.
// ============================================================================

import pino, { type Logger, type LoggerOptions, type DestinationStream } from 'pino';

export const REDACT_PATHS = [
  'req.body.password',
  'req.body.passwordHash',
  'req.headers.authorization',
  'req.headers.cookie',
  // Some pino-http versions log under different shapes
  'request.body.password',
  'request.body.passwordHash',
  'request.headers.authorization',
  'request.headers.cookie',
];

type BuildLoggerOptions = {
  destination?: DestinationStream;
  level?: LoggerOptions['level'];
};

function isPretty(): boolean {
  const env = process.env['NODE_ENV'];
  return env !== 'production' && env !== 'test';
}

function defaultLevel(): LoggerOptions['level'] {
  const explicit = process.env['LOG_LEVEL'];
  if (explicit) return explicit as LoggerOptions['level'];
  // Keep vitest output clean — design ADR #9 already gates pino-http on test;
  // also silence the logger itself so errorHandler tests don't flood stdout.
  if (process.env['NODE_ENV'] === 'test') return 'silent';
  return 'info';
}

export function buildLogger(options: BuildLoggerOptions = {}): Logger {
  // If caller provided an explicit destination (e.g. test capturing output),
  // honor `info` as the default level so logs are actually emitted unless
  // the caller explicitly silences them.
  const fallbackLevel = options.destination ? 'info' : defaultLevel();

  const baseOptions: LoggerOptions = {
    level: options.level ?? fallbackLevel,
    redact: {
      paths: REDACT_PATHS,
      censor: '[Redacted]',
    },
  };

  // Custom destination wins (used by tests + custom setups). Pretty transport
  // is incompatible with a passed destination stream — skip pretty if a
  // destination is explicitly provided.
  if (options.destination) {
    return pino(baseOptions, options.destination);
  }

  if (isPretty()) {
    return pino({
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      },
    });
  }

  return pino(baseOptions);
}

export const logger: Logger = buildLogger();
