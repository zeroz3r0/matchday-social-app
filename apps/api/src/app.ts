// ============================================================================
// MatchDay Social — Express App (without listen — for testing)
// ============================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { matchRoutes } from './routes/matches';
import { voteRoutes } from './routes/votes';
import { clubRoutes } from './routes/clubs';
import { competitionRoutes } from './routes/competitions';
import { rankingRoutes } from './routes/rankings';

const app = express();

// ─── Global Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: process.env['NODE_ENV'] === 'production'
      ? process.env['CORS_ORIGIN'] || false
      : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));

// Only use morgan in non-test environments
if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan('dev'));
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

if (process.env['NODE_ENV'] !== 'test') {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: { code: 'RATE_LIMIT', message: 'Demasiadas peticiones, intenta de nuevo mas tarde' } },
    }),
  );
}

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    },
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/rankings', rankingRoutes);

// ─── Error Handler (must be last) ──────────────────────────────────────────

app.use(errorHandler);

export default app;
