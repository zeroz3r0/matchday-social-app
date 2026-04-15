// ============================================================================
// MatchDay Social — Server Entry Point
// ============================================================================

import app from './app';
import { startScheduledJobs } from './jobs/scheduler';

const PORT = process.env['PORT'] || 3000;

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
