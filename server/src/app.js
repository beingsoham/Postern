import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './config.js';
import { healthRouter } from './routes/health.js';
import { emailsRouter } from './routes/emails.js';
import { tasksRouter } from './routes/tasks.js';
import { followUpsRouter } from './routes/followUps.js';
import { analyzeRouter } from './routes/analyze.js';
import { briefingRouter } from './routes/briefing.js';
import { settingsRouter } from './routes/settings.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

// App factory. Exported so tests can mount the app without binding a port.
export function createApp() {
  const app = express();

  // Behind a proxy we still want the real client IP for later rate limiting.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security headers. The API serves JSON only, so the content policy can be
  // as tight as it goes.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // Only the client origin may call the API from a browser.
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: config.jsonBodyLimit }));

  // A local app still gets a ceiling: a runaway script or a stuck retry loop
  // should not be able to hammer the model. Disabled under test so the suite
  // is not rate limited by its own speed.
  if (!config.isTest) {
    app.use(
      '/api',
      rateLimit({
        windowMs: 60_000,
        limit: 240,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: { code: 'rate_limited', message: 'Too many requests' } },
      }),
    );

    // Analysis is far more expensive than a read, so it gets its own ceiling.
    app.use(
      ['/api/analyze-all', '/api/emails/:id/analyze', '/api/emails/:id/drafts'],
      rateLimit({
        windowMs: 60_000,
        limit: 30,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: { code: 'rate_limited', message: 'Too many analysis requests' } },
      }),
    );
  }

  app.use('/api', healthRouter);
  app.use('/api', emailsRouter);
  app.use('/api', tasksRouter);
  app.use('/api', followUpsRouter);
  app.use('/api', analyzeRouter);
  app.use('/api', briefingRouter);
  app.use('/api', settingsRouter);

  // Order matters: unmatched route first, then the single error handler.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
