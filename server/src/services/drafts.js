import { getThread } from '../db/queries.js';
import { cleanBody } from './ai/clean.js';
import { chatJson } from './ai/ollamaClient.js';
import { DRAFT_SYSTEM } from './ai/prompts.js';
import { DraftSchema, draftFormat } from './ai/schemas.js';

const TONE_GUIDE = {
  friendly: 'Warm and conversational, but still professional. Two or three sentences.',
  formal: 'Polite and formal. Complete sentences, no contractions.',
  brief: 'Three sentences at most. Direct and plain.',
};

/**
 * Drafts a reply. It is stored, never sent: there is no send path in this
 * application at all.
 */
export async function generateDraft(db, email, tone = 'friendly') {
  const thread = getThread(db, email.thread_id, 5)
    .map((m) => `${m.direction === 'out' ? 'You' : m.sender}: ${cleanBody(m.body, 400)}`)
    .join('\n\n');

  const { data, model } = await chatJson({
    system: `${DRAFT_SYSTEM}\n\nTone: ${TONE_GUIDE[tone]}`,
    format: draftFormat,
    schema: DraftSchema,
    user: [
      '--- BEGIN THREAD DATA ---',
      thread,
      '--- END THREAD DATA ---',
      '',
      `Draft a reply to the most recent message, from the reader's point of view.`,
    ].join('\n'),
  });

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO drafts (email_id, content, tone, created_at) VALUES (?, ?, ?, ?)`,
    )
    .run(email.id, data.content, tone, new Date().toISOString());

  return { id: lastInsertRowid, email_id: email.id, content: data.content, tone, model };
}
