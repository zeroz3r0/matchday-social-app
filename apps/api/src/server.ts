// ============================================================================
// MatchDay Social — Server Entry Point
// ============================================================================

import app from './app';
import { logger } from './utils/logger';
import { startScheduledJobs } from './jobs/scheduler';

const PORT = process.env['PORT'] || 3000;

app.listen(PORT, () => {
  logger.info(
    {
      env: process.env['NODE_ENV'] || 'development',
      port: PORT,
      health: `http://localhost:${PORT}/api/health`,
    },
    'MatchDay Social API listening',
  );

  startScheduledJobs();
});

export default app;
