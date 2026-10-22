import { Router } from 'express';
import { z } from 'zod';

import { getDb } from '../db/db.js';
import { getEmailById, getThread, setPriorityOverride } from '../db/queries.js';
import { ApiError } from '../errors.js';
import { validate } from '../middleware/validate.js';

export const emailsRouter = Router();

const PRIORITIES = ['urgent', 'important', 'normal', 'low'];
const CATEGORIES = [
  'academic',
  'work',
  'recruiting',
  'finance',
  'security',
  'newsletter',
  'social',
  'other',
];

const listQuery = z.object({
  priority: z.enum(PRIORITIES).optional(),
  category: z.enum(CATEGORIES).optional(),
  search: z.string().trim().max(200).optional(),
  direction: z.enum(['in', 'out']).optional(),
  unanalyzed: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

const idParam = z.object({ id: z.coerce.number().int().positive() });

emailsRouter.get('/emails', validate(listQuery), (req, res) => {
  const { priority, category, search, direction, unanalyzed, page, limit } = req.valid.query;
  const db = getDb();

  // Built from a fixed set of fragments; every value is a bound parameter.
  const where = [];
  const params = {};

  if (priority) {
    where.push('c.priority = @priority');
    params.priority = priority;
  }
  if (category) {
    where.push('c.category = @category');
    params.category = category;
  }
  if (direction) {
    where.push('e.direction = @direction');
    params.direction = direction;
  }
  if (unanalyzed) where.push('c.email_id IS NULL');
  if (search) {
    where.push('(e.subject LIKE @search OR e.sender LIKE @search OR e.body LIKE @search)');
    params.search = `%${search}%`;
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { total } = db
    .prepare(
      `SELECT COUNT(*) AS total FROM emails e
              LEFT JOIN classifications c ON c.email_id = e.id ${clause}`,
    )
    .get(params);

  const rows = db
    .prepare(
      `SELECT e.id, e.provider_id, e.thread_id, e.sender, e.sender_name, e.subject,
              e.received_at, e.direction, e.is_read, e.is_demo,
              substr(e.body, 1, 180) AS preview,
              c.category, c.priority, c.reason, c.requires_reply,
              c.status AS analysis_status, c.model, c.user_override
       FROM emails e
       LEFT JOIN classifications c ON c.email_id = e.id
       ${clause}
       ORDER BY e.received_at DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset: (page - 1) * limit });

  res.json({
    emails: rows,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

emailsRouter.get('/emails/:id', validate(idParam, 'params'), (req, res) => {
  const db = getDb();
  const email = getEmailById(db, req.valid.params.id);
  if (!email) throw ApiError.notFound('No email with that id');

  const tasks = db
    .prepare(
      `SELECT id, description, due_date, status, verification
       FROM action_items WHERE email_id = ? ORDER BY due_date IS NULL, due_date`,
    )
    .all(email.id);

  res.json({ email, thread: getThread(db, email.thread_id), tasks });
});

// A user correction is authoritative: it pins the priority against re-analysis.
const overrideBody = z.object({ priority: z.enum(PRIORITIES) });

emailsRouter.patch(
  '/emails/:id/priority',
  validate(idParam, 'params'),
  validate(overrideBody, 'body'),
  (req, res) => {
    const db = getDb();
    const { changes } = setPriorityOverride(db, req.valid.params.id, req.valid.body.priority);
    if (!changes) throw ApiError.notFound('That email has not been analyzed yet');

    res.json({ email: getEmailById(db, req.valid.params.id) });
  },
);
