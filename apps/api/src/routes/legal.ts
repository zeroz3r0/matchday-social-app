// ============================================================================
// Legal Routes — Public ToS + Privacy markdown
//
// REQ-LD-1/REQ-LD-2: serve `{ success, data: { version, content } }`.
// REQ-LD-5: Cache-Control: max-age=300 on both endpoints.
// No auth required — public endpoints.
// ============================================================================

import { Router, Request, Response } from 'express';
import { getTos, getPrivacy } from '../services/legal';

export const legalRoutes = Router();

const CACHE_HEADER = 'max-age=300';

legalRoutes.get('/tos', (_req: Request, res: Response) => {
  const doc = getTos();
  res.set('Cache-Control', CACHE_HEADER);
  res.json({
    success: true,
    data: { version: doc.version, content: doc.content },
  });
});

legalRoutes.get('/privacy', (_req: Request, res: Response) => {
  const doc = getPrivacy();
  res.set('Cache-Control', CACHE_HEADER);
  res.json({
    success: true,
    data: { version: doc.version, content: doc.content },
  });
});
