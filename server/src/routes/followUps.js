import { Router } from 'express';
import { z } from 'zod';

import { getDb } from '../db/db.js';
import { ApiError } from '../errors.js';
import { validate } from '../middleware/validate.js';

export const followUpsRouter = Router();

const idParam = z.object({ id: z.coerce.number().int().positive() });
const patchBody = z.object({
  status: z.enum(['pending', 'followed_up', 'resolved', 'dismissed']),
});

followUpsRouter.get('/follow-ups', (_req, res) => {
  const db = getDb();

  const followUps = db
    .prepare(
      `SELECT f.id, f.thread_id, f.suggested_date, f.status, f.notes, f.created_at,
              e.id AS email_id, e.subject, e.received_at, e.sender
       FROM follow_ups f
       LEFT JOIN emails e ON e.id = f.email_id
       ORDER BY f.status = 'pending' DESC, e.received_at ASC`,
    )
    .all();

  res.json({ follow_ups: followUps, total: followUps.length });
});

followUpsRouter.patch(
  '/follow-ups/:id',
  validate(idParam, 'params'),
  validate(patchBody, 'body'),
  (req, res) => {
    const db = getDb();
    const { changes } = db
      .prepare('UPDATE follow_ups SET status = ? WHERE id = ?')
      .run(req.valid.body.status, req.valid.params.id);

    if (!changes) throw ApiError.notFound('No follow-up with that id');

    res.json({
      follow_up: db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(req.valid.params.id),
    });
  },
);
