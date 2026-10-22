import express from 'express';
import cors from 'cors';

import { config } from './config.js';
import { healthRouter } from './routes/health.js';
import { emailsRouter } from './routes/emails.js';
import { tasksRouter } from './routes/tasks.js';
import { followUpsRouter } from './routes/followUps.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

// App factory. Exported so tests can mount the app without binding a port.
export function createApp() {
  const app = express();

  // Behind a proxy we still want the real client IP for later rate limiting.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Only the client origin may call the API from a browser.
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: config.jsonBodyLimit }));

  app.use('/api', healthRouter);
  app.use('/api', emailsRouter);
  app.use('/api', tasksRouter);
  app.use('/api', followUpsRouter);

  // Order matters: unmatched route first, then the single error handler.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
