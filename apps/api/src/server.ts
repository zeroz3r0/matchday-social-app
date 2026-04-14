// ============================================================================
// MatchDay Social — API Server
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
import { startScheduledJobs } from './jobs/scheduler';

const app = express();
const PORT = process.env['PORT'] || 3000;

// ─── Global Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:19006',
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

// Rate limiting: 100 requests per 15 minutes per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Demasiadas peticiones, intenta de nuevo mas tarde' } },
  }),
);

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

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
  ⚽ MatchDay Social API
  ──────────────────────
  Environment: ${process.env['NODE_ENV'] || 'development'}
  Port:        ${PORT}
  Health:      http://localhost:${PORT}/api/health
  `);

  // Start cron jobs (stat auto-confirm, voting window close)
  startScheduledJobs();
});

export default app;
