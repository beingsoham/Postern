import { Router } from 'express';
import { z } from 'zod';

import { getDb } from '../db/db.js';
import { getEmailById } from '../db/queries.js';
import { ApiError } from '../errors.js';
import { validate } from '../middleware/validate.js';
import { analyzeAndSave } from '../services/ai/analyzeEmail.js';
import { checkOllama } from '../services/ai/ollamaClient.js';
import { config } from '../config.js';

export const analyzeRouter = Router();

const idParam = z.object({ id: z.coerce.number().int().positive() });

analyzeRouter.post('/emails/:id/analyze', validate(idParam, 'params'), async (req, res) => {
  const db = getDb();
  const email = getEmailById(db, req.valid.params.id);
  if (!email) throw ApiError.notFound('No email with that id');

  const analysis = await analyzeAndSave(db, email);
  res.json({ email: getEmailById(db, email.id), analysis: analysis.classification });
});

const allBody = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  reanalyze: z.coerce.boolean().default(false),
});

// One at a time. A single local model serving concurrent requests is slower
// overall and risks swapping weights in and out of VRAM.
analyzeRouter.post('/analyze-all', validate(allBody, 'body'), async (req, res) => {
  const { limit, reanalyze } = req.valid.body;
  const db = getDb();

  const pending = db
    .prepare(
      `SELECT e.* FROM emails e
       LEFT JOIN classifications c ON c.email_id = e.id
       WHERE e.direction = 'in' ${reanalyze ? '' : 'AND c.email_id IS NULL'}
       ORDER BY e.received_at DESC LIMIT ?`,
    )
    .all(limit);

  let analyzed = 0;
  let fallbacks = 0;

  for (const email of pending) {
    const result = await analyzeAndSave(db, email);
    analyzed += 1;
    if (result.classification.status === 'fallback') fallbacks += 1;
  }

  res.json({ analyzed, fallbacks, remaining: Math.max(0, pending.length - analyzed) });
});

// Safe status for the sidebar: model name and reachability, never a token.
analyzeRouter.get('/settings/ai', async (_req, res) => {
  const status = await checkOllama();
  res.json({
    model: status.model,
    reachable: status.reachable && status.model_available,
    ollama_reachable: status.reachable,
    model_available: status.model_available,
    url: config.ollamaUrl,
  });
});
