import { chatJson } from './ai/ollamaClient.js';
import { BRIEFING_SYSTEM } from './ai/prompts.js';
import { BriefingSchema, briefingFormat } from './ai/schemas.js';

// Only stored, already-validated facts reach the model. It never sees raw
// email bodies here, and it cannot introduce an email that does not exist.
export function gatherFacts(db, { withinDays = 3 } = {}) {
  const cutoff = new Date(Date.now() + withinDays * 86_400_000).toISOString().slice(0, 10);

  const attention = db
    .prepare(
      `SELECT e.id, e.subject, e.sender_name, e.sender, c.priority, c.reason
       FROM emails e JOIN classifications c ON c.email_id = e.id
       WHERE c.priority IN ('urgent','important') AND e.direction = 'in'
       ORDER BY CASE c.priority WHEN 'urgent' THEN 0 ELSE 1 END, e.received_at DESC
       LIMIT 5`,
    )
    .all();

  const replies = db
    .prepare(
      // Low priority is excluded for the same reason it cannot create tasks:
      // mail we judged unimportant does not get to claim a place in the
      // briefing. Without this the injected sample, which asks to be replied
      // to, appeared under 'Reply needed'.
      `SELECT e.id, e.subject, e.sender_name, e.sender
       FROM emails e JOIN classifications c ON c.email_id = e.id
       WHERE c.requires_reply = 1 AND e.direction = 'in' AND c.priority != 'low'
       ORDER BY e.received_at DESC LIMIT 5`,
    )
    .all();

  const tasks = db
    .prepare(
      `SELECT t.id, t.description, t.due_date, e.subject AS source_subject
       FROM action_items t JOIN emails e ON e.id = t.email_id
       WHERE t.status = 'open' AND t.due_date IS NOT NULL AND date(t.due_date) <= date(?)
       ORDER BY t.due_date LIMIT 5`,
    )
    .all(cutoff);

  return { needs_attention: attention, reply_needed: replies, action_items: tasks };
}

// Built from the data alone. Used when the model fails, and as the shape the
// model's version has to match.
export function deterministicBriefing(facts) {
  const n = facts.needs_attention.length;
  const headline =
    n === 0
      ? 'Nothing needs you right now'
      : n === 1
        ? 'One thing needs you today'
        : `${n} things need you today`;

  const next = facts.needs_attention[0] ?? facts.reply_needed[0];

  return {
    headline,
    needs_attention: facts.needs_attention.map((e) => ({
      email_id: e.id,
      note: e.reason ?? e.subject,
    })),
    reply_needed: facts.reply_needed.map((e) => ({
      email_id: e.id,
      note: `${e.sender_name ?? e.sender} is waiting on a reply.`,
    })),
    action_items: facts.action_items.map((t) => ({
      task_id: t.id,
      note: t.due_date ? `${t.description} (due ${t.due_date})` : t.description,
    })),
    next_step: next ? `Start with: ${next.subject}` : 'Nothing is waiting on you.',
    source: 'rules',
  };
}

// Every referenced id must exist in the facts we supplied. Anything else is
// a hallucination and is dropped rather than shown.
function dropUnknownReferences(briefing, facts) {
  const emailIds = new Set([
    ...facts.needs_attention.map((e) => e.id),
    ...facts.reply_needed.map((e) => e.id),
  ]);
  const taskIds = new Set(facts.action_items.map((t) => t.id));

  return {
    ...briefing,
    needs_attention: tidyItems(
      briefing.needs_attention.filter((i) => emailIds.has(i.email_id)),
    ),
    reply_needed: tidyItems(briefing.reply_needed.filter((i) => emailIds.has(i.email_id))),
    action_items: tidyItems(briefing.action_items.filter((i) => taskIds.has(i.task_id))),
  };
}

// The model repeats a machine date inside the sentence it writes. The date is
// already stored and rendered separately, so it is noise here.
const ISO_DATE = /\s*\b\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?\b/g;

const tidyNote = (note) =>
  note
    .replace(ISO_DATE, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s*\b(by|on|before|due|until)\s*\.?\s*$/i, '')
    .trim()
    .replace(/\s*\.$/, '');

const tidyItems = (items) => items.map((i) => ({ ...i, note: tidyNote(i.note) }));

export async function buildBriefing(db, options) {
  const facts = gatherFacts(db, options);
  const fallback = deterministicBriefing(facts);

  if (
    !facts.needs_attention.length &&
    !facts.reply_needed.length &&
    !facts.action_items.length
  ) {
    return fallback;
  }

  try {
    const { data } = await chatJson({
      system: BRIEFING_SYSTEM,
      user: `Facts:\n${JSON.stringify(facts, null, 2)}\n\nWrite the briefing.`,
      format: briefingFormat,
      schema: BriefingSchema,
    });

    const checked = dropUnknownReferences(data, facts);

    // If validation emptied it, the deterministic version is more useful.
    const empty =
      !checked.needs_attention.length &&
      !checked.reply_needed.length &&
      !checked.action_items.length;

    return empty ? fallback : { ...checked, source: 'model' };
  } catch {
    return fallback;
  }
}
