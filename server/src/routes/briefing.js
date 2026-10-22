import { Router } from 'express';
import { z } from 'zod';

import { getDb } from '../db/db.js';
import { getEmailById } from '../db/queries.js';
import { ApiError } from '../errors.js';
import { validate } from '../middleware/validate.js';
import { buildBriefing } from '../services/briefing.js';
import { generateDraft } from '../services/drafts.js';
import { detectFollowUps } from '../services/followUps.js';
import { getSetting } from '../db/queries.js';

export const briefingRouter = Router();

briefingRouter.get('/briefing/today', async (_req, res) => {
  res.json({ briefing: await buildBriefing(getDb()) });
});

const idParam = z.object({ id: z.coerce.number().int().positive() });
const draftBody = z.object({ tone: z.enum(['friendly', 'formal', 'brief']).default('friendly') });

briefingRouter.post(
  '/emails/:id/drafts',
  validate(idParam, 'params'),
  validate(draftBody, 'body'),
  async (req, res) => {
    const db = getDb();
    const email = getEmailById(db, req.valid.params.id);
    if (!email) throw ApiError.notFound('No email with that id');

    res.json({ draft: await generateDraft(db, email, req.valid.body.tone) });
  },
);

briefingRouter.post('/follow-ups/detect', (_req, res) => {
  const db = getDb();
  const days = Number(getSetting(db, 'follow_up_days', '3'));
  res.json({ detected: detectFollowUps(db, { days }) });
});
