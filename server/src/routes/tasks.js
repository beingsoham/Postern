import { Router } from 'express';
import { z } from 'zod';

import { getDb } from '../db/db.js';
import { ApiError } from '../errors.js';
import { validate } from '../middleware/validate.js';

export const tasksRouter = Router();

const listQuery = z.object({
  status: z.enum(['open', 'done', 'dismissed']).optional(),
  due_within_days: z.coerce.number().int().min(0).max(365).optional(),
});

const idParam = z.object({ id: z.coerce.number().int().positive() });

// At least one field, so an empty PATCH is a clear 400 rather than a no-op.
const patchBody = z
  .object({
    description: z.string().trim().min(1).max(300).optional(),
    due_date: z.string().date().nullable().optional(),
    status: z.enum(['open', 'done', 'dismissed']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

tasksRouter.get('/tasks', validate(listQuery), (req, res) => {
  const { status, due_within_days: within } = req.valid.query;
  const db = getDb();

  const where = ['1 = 1'];
  const params = {};

  if (status) {
    where.push('t.status = @status');
    params.status = status;
  }
  if (within !== undefined) {
    where.push('t.due_date IS NOT NULL AND date(t.due_date) <= date(@cutoff)');
    params.cutoff = new Date(Date.now() + within * 86_400_000).toISOString().slice(0, 10);
  }

  const tasks = db
    .prepare(
      `SELECT t.id, t.description, t.due_date, t.status, t.verification, t.created_at,
              e.id AS email_id, e.subject AS email_subject, e.sender AS email_sender
       FROM action_items t
       JOIN emails e ON e.id = t.email_id
       WHERE ${where.join(' AND ')}
       ORDER BY t.due_date IS NULL, t.due_date, t.created_at DESC`,
    )
    .all(params);

  res.json({ tasks, total: tasks.length });
});

tasksRouter.patch(
  '/tasks/:id',
  validate(idParam, 'params'),
  validate(patchBody, 'body'),
  (req, res) => {
    const db = getDb();
    const { id } = req.valid.params;
    const patch = req.valid.body;

    // Only these three columns are ever writable from the API.
    const sets = [];
    const params = { id };
    for (const field of ['description', 'due_date', 'status']) {
      if (field in patch) {
        sets.push(`${field} = @${field}`);
        params[field] = patch[field];
      }
    }

    const { changes } = db
      .prepare(`UPDATE action_items SET ${sets.join(', ')} WHERE id = @id`)
      .run(params);

    if (!changes) throw ApiError.notFound('No task with that id');

    res.json({ task: db.prepare('SELECT * FROM action_items WHERE id = ?').get(id) });
  },
);
