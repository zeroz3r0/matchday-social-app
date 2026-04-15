// ============================================================================
// MatchDay Social — Server Entry Point
// ============================================================================

import app from './app';
import rateLimit from 'express-rate-limit';
import { startScheduledJobs } from './jobs/scheduler';

const PORT = process.env['PORT'] || 3000;

// Rate limiting (only in production/dev, not tests)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Demasiadas peticiones, intenta de nuevo mas tarde' } },
  }),
);

app.listen(PORT, () => {
  console.log(`
  ⚽ MatchDay Social API
  ──────────────────────
  Environment: ${process.env['NODE_ENV'] || 'development'}
  Port:        ${PORT}
  Health:      http://localhost:${PORT}/api/health
  `);

  startScheduledJobs();
});

export default app;
