import { openDb, setDb } from '../src/db/db.js';
import { upsertEmail } from '../src/db/queries.js';

// A fresh in-memory database per test file. Nothing touches the real file.
export function freshDb() {
  const db = openDb(':memory:');
  setDb(db);
  return db;
}

const BASE = {
  thread_id: 't-test',
  sender: 'someone@example.com',
  sender_name: 'Someone',
  subject: 'A subject',
  body: 'A body.',
  direction: 'in',
  is_demo: 1,
  list_unsubscribe: 0,
};

export function addEmail(db, over = {}) {
  const email = {
    ...BASE,
    provider_id: `test-${Math.random().toString(36).slice(2)}`,
    received_at: new Date().toISOString(),
    ...over,
  };
  return upsertEmail(db, email);
}

export function addClassification(db, emailId, over = {}) {
  db.prepare(
    `INSERT INTO classifications
       (email_id, category, priority, score, reason, requires_reply, model, status, created_at)
     VALUES (@email_id, @category, @priority, @score, @reason, @requires_reply,
             @model, @status, @created_at)`,
  ).run({
    email_id: emailId,
    category: 'work',
    priority: 'normal',
    score: 30,
    reason: 'Because.',
    requires_reply: 0,
    model: 'test-model',
    status: 'ok',
    created_at: new Date().toISOString(),
    ...over,
  });
}

/**
 * Loads a fresh app and database inside the CURRENT module graph.
 *
 * Mocking with vi.doMock requires vi.resetModules(), which also replaces the
 * db module — so a connection set before the reset is invisible to the app
 * that comes after it. Both must be imported on this side of the reset.
 */
export async function loadApp() {
  const dbModule = await import('../src/db/db.js');
  const db = dbModule.openDb(':memory:');
  dbModule.setDb(db);

  const { createApp } = await import('../src/app.js');
  return { app: createApp(), db };
}
