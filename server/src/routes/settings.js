import { Router } from 'express';
import { z } from 'zod';

import { getDb } from '../db/db.js';
import { getSetting, setSetting } from '../db/queries.js';
import { validate } from '../middleware/validate.js';

export const settingsRouter = Router();

// Non-secret preferences only. Nothing here is ever a token or a credential.
const DEFAULTS = { follow_up_days: '3' };

settingsRouter.get('/settings', (_req, res) => {
  const db = getDb();
  res.json({
    settings: {
      follow_up_days: Number(getSetting(db, 'follow_up_days', DEFAULTS.follow_up_days)),
    },
  });
});

const patchBody = z
  .object({ follow_up_days: z.coerce.number().int().min(1).max(90).optional() })
  .refine((v) => Object.keys(v).length > 0, { message: 'No settings to update' });

settingsRouter.patch('/settings', validate(patchBody, 'body'), (req, res) => {
  const db = getDb();
  for (const [key, value] of Object.entries(req.valid.body)) setSetting(db, key, value);

  res.json({
    settings: {
      follow_up_days: Number(getSetting(db, 'follow_up_days', DEFAULTS.follow_up_days)),
    },
  });
});

// Deleting the emails cascades to classifications, tasks, drafts and
// follow-ups, so there is no derived data left behind anywhere.
const deleteBody = z.object({ confirm: z.literal('delete all local data') });

settingsRouter.delete('/data', validate(deleteBody, 'body'), (req, res) => {
  const db = getDb();

  const counts = db.transaction(() => {
    const before = db.prepare('SELECT COUNT(*) AS n FROM emails').get().n;
    db.prepare('DELETE FROM emails').run();
    db.prepare('DELETE FROM settings').run();
    return before;
  })();

  res.json({ deleted_emails: counts, remaining: db.prepare('SELECT COUNT(*) AS n FROM emails').get().n });
});
