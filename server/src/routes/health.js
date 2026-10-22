import { Router } from 'express';

export const healthRouter = Router();

// Liveness check. Deliberately cheap: no database, no model.
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
