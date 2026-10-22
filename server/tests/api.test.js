import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { addClassification, addEmail, freshDb } from './helpers.js';

let db;
let app;

beforeEach(() => {
  db = freshDb();
  app = createApp();
});

describe('GET /api/emails', () => {
  it('paginates and reports the total', async () => {
    for (let i = 0; i < 7; i += 1) addEmail(db, { subject: `Mail ${i}` });

    const res = await request(app).get('/api/emails?limit=3&page=2');

    expect(res.status).toBe(200);
    expect(res.body.emails).toHaveLength(3);
    expect(res.body.total).toBe(7);
    expect(res.body.pages).toBe(3);
    expect(res.body.page).toBe(2);
  });

  it('filters by priority through the join', async () => {
    const a = addEmail(db, { subject: 'Urgent one' });
    const b = addEmail(db, { subject: 'Quiet one' });
    addClassification(db, a, { priority: 'urgent' });
    addClassification(db, b, { priority: 'low' });

    const res = await request(app).get('/api/emails?priority=urgent');

    expect(res.body.emails).toHaveLength(1);
    expect(res.body.emails[0].subject).toBe('Urgent one');
  });

  it('searches subject, sender and body', async () => {
    addEmail(db, { subject: 'Nothing here', body: 'A needle in the body.' });
    addEmail(db, { subject: 'Unrelated', body: 'Nothing.' });

    const res = await request(app).get('/api/emails?search=needle');
    expect(res.body.emails).toHaveLength(1);
  });

  it('caps the page size at 50', async () => {
    const res = await request(app).get('/api/emails?limit=500');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('rejects an unknown priority', async () => {
    const res = await request(app).get('/api/emails?priority=critical');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/emails/:id', () => {
  it('returns the email with its thread and tasks', async () => {
    const id = addEmail(db, { subject: 'Parent', thread_id: 't-x' });
    addEmail(db, { subject: 'Reply', thread_id: 't-x' });

    const res = await request(app).get(`/api/emails/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.email.subject).toBe('Parent');
    expect(res.body.thread).toHaveLength(2);
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });

  it('404s for a missing id', async () => {
    const res = await request(app).get('/api/emails/9999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('400s for a non-numeric id', async () => {
    const res = await request(app).get('/api/emails/abc');
    expect(res.status).toBe(400);
  });
});

describe('priority override', () => {
  it('records the correction and marks it as the user’s', async () => {
    const id = addEmail(db);
    addClassification(db, id, { priority: 'low' });

    const res = await request(app)
      .patch(`/api/emails/${id}/priority`)
      .send({ priority: 'urgent' });

    expect(res.status).toBe(200);
    expect(res.body.email.priority).toBe('urgent');
    expect(res.body.email.user_override).toBe(1);
  });

  it('404s when the email was never analyzed', async () => {
    const id = addEmail(db);
    const res = await request(app)
      .patch(`/api/emails/${id}/priority`)
      .send({ priority: 'urgent' });
    expect(res.status).toBe(404);
  });
});

describe('tasks', () => {
  it('lists tasks joined to their source email', async () => {
    const id = addEmail(db, { subject: 'Source mail' });
    db.prepare(
      `INSERT INTO action_items (email_id, description, due_date, created_at)
       VALUES (?, ?, ?, ?)`,
    ).run(id, 'Do the thing', '2026-11-01', new Date().toISOString());

    const res = await request(app).get('/api/tasks');

    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].email_subject).toBe('Source mail');
  });

  it('updates only the fields given', async () => {
    const id = addEmail(db);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO action_items (email_id, description, due_date, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(id, 'Original', '2026-11-01', new Date().toISOString());

    const res = await request(app)
      .patch(`/api/tasks/${lastInsertRowid}`)
      .send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('done');
    expect(res.body.task.description).toBe('Original');
  });

  it('rejects an empty patch', async () => {
    const res = await request(app).patch('/api/tasks/1').send({});
    expect(res.status).toBe(400);
  });

  it('rejects an unknown status', async () => {
    const res = await request(app).patch('/api/tasks/1').send({ status: 'maybe' });
    expect(res.status).toBe(400);
  });
});

describe('follow-ups', () => {
  it('detects a sent message with no reply and ignores answered threads', async () => {
    const old = new Date(Date.now() - 10 * 86_400_000).toISOString();
    addEmail(db, { thread_id: 't-silent', direction: 'out', received_at: old });

    addEmail(db, { thread_id: 't-answered', direction: 'out', received_at: old });
    addEmail(db, {
      thread_id: 't-answered',
      direction: 'in',
      received_at: new Date().toISOString(),
    });

    const detect = await request(app).post('/api/follow-ups/detect');
    expect(detect.body.detected).toBe(1);

    const list = await request(app).get('/api/follow-ups');
    expect(list.body.follow_ups).toHaveLength(1);
    expect(list.body.follow_ups[0].thread_id).toBe('t-silent');
  });
});

describe('settings', () => {
  it('round-trips the follow-up window', async () => {
    await request(app).patch('/api/settings').send({ follow_up_days: 9 });
    const res = await request(app).get('/api/settings');
    expect(res.body.settings.follow_up_days).toBe(9);
  });

  it('refuses a deletion without the exact phrase', async () => {
    addEmail(db);
    const res = await request(app).delete('/api/data').send({ confirm: 'yes' });

    expect(res.status).toBe(400);
    expect(db.prepare('SELECT COUNT(*) AS n FROM emails').get().n).toBe(1);
  });

  it('deletes everything when the phrase is exact', async () => {
    const id = addEmail(db);
    addClassification(db, id);

    const res = await request(app)
      .delete('/api/data')
      .send({ confirm: 'delete all local data' });

    expect(res.status).toBe(200);
    expect(db.prepare('SELECT COUNT(*) AS n FROM emails').get().n).toBe(0);
    // The cascade must take the derived rows with it.
    expect(db.prepare('SELECT COUNT(*) AS n FROM classifications').get().n).toBe(0);
  });
});
