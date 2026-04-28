// ============================================================================
// MatchDay Social — Express App (without listen — for testing)
// ============================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

// Sentry MUST init at the top of the module — before any middleware/routes —
// so its handlers can wrap the entire request lifecycle (REQ-BS-2/3).
import { initSentry, Sentry } from './lib/sentry';
initSentry();

import { errorHandler } from './middleware/errorHandler';
import { logger, REDACT_PATHS } from './utils/logger';
import { checkHealth } from './services/health';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { matchRoutes } from './routes/matches';
import { voteRoutes } from './routes/votes';
import { clubRoutes } from './routes/clubs';
import { competitionRoutes } from './routes/competitions';
import { rankingRoutes } from './routes/rankings';
import { legalRoutes } from './routes/legal';

const app = express();

// ─── Sentry Request Handler (MUST be FIRST middleware — REQ-BS-2) ──────────
app.use(Sentry.Handlers.requestHandler());

// ─── Global Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: process.env['NODE_ENV'] === 'production' ? process.env['CORS_ORIGIN'] || false : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));

// Only use morgan in non-test environments
if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan('dev'));
}

// Structured request logging (Pino) — skipped in tests to keep vitest output clean
if (process.env['NODE_ENV'] !== 'test') {
  app.use(
    pinoHttp({
      logger,
      redact: { paths: REDACT_PATHS, censor: '[Redacted]' },
    }),
  );
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

if (process.env['NODE_ENV'] !== 'test') {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Demasiadas peticiones, intenta de nuevo mas tarde' },
      },
    }),
  );
}

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/api/health', async (_req, res, next) => {
  try {
    const data = await checkHealth();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/legal', legalRoutes);

// ─── Error Handlers (Sentry first, then custom envelope handler) ──────────
// REQ-BS-3: Sentry errorHandler MUST be mounted BEFORE the custom errorHandler
// so unknown errors are captured before the response envelope is built.
// REQ-BS-4: Custom handler retains envelope shape — Sentry only captures.

app.use(Sentry.Handlers.errorHandler());
app.use(errorHandler);

export default app;
