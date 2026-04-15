// ============================================================================
// MatchDay Social — Express App (without listen — for testing)
// ============================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

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
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:19006',
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));

// Only use morgan in non-test environments
if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan('dev'));
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
