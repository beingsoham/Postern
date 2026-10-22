import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';

import { addEmail, loadApp } from './helpers.js';

const reply = (over = {}) => ({
  category: 'work',
  priority: 'important',
  requires_reply: true,
  action_items: [{ description: 'Review the pull request', due_date: null }],
  reason: 'A colleague asked for a review.',
  ...over,
});

function mockModel(impl) {
  vi.doMock('../src/services/ai/ollamaClient.js', () => ({
    chatJson: vi.fn(impl),
    chat: vi.fn(),
    checkOllama: vi.fn(async () => ({
      reachable: true,
      model: 'test-model',
      model_available: true,
      installed: ['test-model'],
    })),
  }));
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock('../src/services/ai/ollamaClient.js');
  vi.resetModules();
});

describe('re-analysis is idempotent', () => {
  it('analyzing the same email twice creates no duplicate tasks', async () => {
    mockModel(async () => ({ data: reply(), model: 'test-model' }));
    const { app, db } = await loadApp();

    const id = addEmail(db, {
      subject: 'Review needed on PR 214',
      body: 'Could you review the pull request before standup?',
    });

    await request(app).post(`/api/emails/${id}/analyze`);
    const afterFirst = db.prepare('SELECT COUNT(*) AS n FROM action_items').get().n;

    await request(app).post(`/api/emails/${id}/analyze`);
    const afterSecond = db.prepare('SELECT COUNT(*) AS n FROM action_items').get().n;

    expect(afterFirst).toBe(1);
    expect(afterSecond).toBe(1);

    // And exactly one classification row, not two.
    expect(db.prepare('SELECT COUNT(*) AS n FROM classifications').get().n).toBe(1);
  });

  it('keeps a completed task when the email is analyzed again', async () => {
    mockModel(async () => ({ data: reply(), model: 'test-model' }));
    const { app, db } = await loadApp();

    const id = addEmail(db, { subject: 'Review needed', body: 'Please review it.' });
    await request(app).post(`/api/emails/${id}/analyze`);

    const task = db.prepare('SELECT id FROM action_items LIMIT 1').get();
    await request(app).patch(`/api/tasks/${task.id}`).send({ status: 'done' });

    await request(app).post(`/api/emails/${id}/analyze`);

    const done = db
      .prepare("SELECT COUNT(*) AS n FROM action_items WHERE status = 'done'")
      .get().n;
    expect(done).toBe(1);
  });

  it('does not overwrite a priority the user corrected', async () => {
    mockModel(async () => ({ data: reply({ priority: 'low' }), model: 'test-model' }));
    const { app, db } = await loadApp();

    const id = addEmail(db, { subject: 'Something', body: 'Anything at all.' });
    await request(app).post(`/api/emails/${id}/analyze`);
    await request(app).patch(`/api/emails/${id}/priority`).send({ priority: 'urgent' });

    await request(app).post(`/api/emails/${id}/analyze`);

    const row = db.prepare('SELECT priority, user_override FROM classifications').get();
    expect(row.priority).toBe('urgent');
    expect(row.user_override).toBe(1);
  });
});

describe('the pipeline survives a bad model', () => {
  it('falls back to rules when the model never returns valid output', async () => {
    mockModel(async () => {
      const { AiError } = await import('../src/services/ai/errors.js');
      throw new AiError('invalid', 'Model output was not JSON');
    });
    const { app, db } = await loadApp();

    const id = addEmail(db, { subject: 'Report due today', body: 'Submit by EOD.' });
    const res = await request(app).post(`/api/emails/${id}/analyze`);

    expect(res.status).toBe(200);
    expect(res.body.analysis.status).toBe('fallback');
    expect(res.body.analysis.priority).toBeTruthy();
  });

  it('reports fallbacks in the batch result', async () => {
    let call = 0;
    mockModel(async () => {
      call += 1;
      if (call % 2 === 0) {
        const { AiError } = await import('../src/services/ai/errors.js');
        throw new AiError('timeout', 'Too slow');
      }
      return { data: reply(), model: 'test-model' };
    });
    const { app, db } = await loadApp();

    for (let i = 0; i < 4; i += 1) addEmail(db, { subject: `Mail ${i}`, body: 'Body.' });

    const res = await request(app).post('/api/analyze-all').send({ limit: 10 });

    expect(res.body.analyzed).toBe(4);
    expect(res.body.fallbacks).toBe(2);
  });
});

describe('the briefing only cites facts it was given', () => {
  it('drops an email id the model invented', async () => {
    mockModel(async () => ({
      data: {
        headline: 'Two things need you today',
        needs_attention: [{ email_id: 999_999, note: 'An email that does not exist' }],
        reply_needed: [],
        action_items: [],
        next_step: 'Start somewhere.',
      },
      model: 'test-model',
    }));
    const { app, db } = await loadApp();

    const id = addEmail(db, { subject: 'Real mail', body: 'Real body.' });
    db.prepare(
      `INSERT INTO classifications
         (email_id, category, priority, score, reason, requires_reply, model, status, created_at)
       VALUES (?, 'work', 'urgent', 80, 'Because.', 0, 'test-model', 'ok', ?)`,
    ).run(id, new Date().toISOString());

    const res = await request(app).get('/api/briefing/today');

    const cited = res.body.briefing.needs_attention.map((i) => i.email_id);
    expect(cited).not.toContain(999_999);
    // With nothing valid left, the deterministic briefing takes over.
    expect(res.body.briefing.source).toBe('rules');
  });
});

describe('drafts', () => {
  it('stores a draft and never exposes a send route', async () => {
    mockModel(async () => ({
      data: { content: 'Thanks, I will take a look.' },
      model: 'test-model',
    }));
    const { app, db } = await loadApp();

    const id = addEmail(db, { subject: 'Question', body: 'Can you look at this?' });
    const res = await request(app).post(`/api/emails/${id}/drafts`).send({ tone: 'friendly' });

    expect(res.status).toBe(200);
    expect(res.body.draft.content).toContain('take a look');
    expect(db.prepare('SELECT COUNT(*) AS n FROM drafts').get().n).toBe(1);

    // There is no send endpoint, by design.
    const send = await request(app).post(`/api/emails/${id}/send`).send({});
    expect(send.status).toBe(404);
  });

  it('rejects an unknown tone', async () => {
    mockModel(async () => ({ data: { content: 'x' }, model: 'test-model' }));
    const { app, db } = await loadApp();

    const id = addEmail(db);
    const res = await request(app).post(`/api/emails/${id}/drafts`).send({ tone: 'sarcastic' });
    expect(res.status).toBe(400);
  });
});
