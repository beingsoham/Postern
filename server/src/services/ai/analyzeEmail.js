import { analyzeWithRules } from '../priority/ruleEngine.js';
import { extractDates } from '../priority/dates.js';
import { saveAnalysis } from '../../db/queries.js';
import { cleanBody } from './clean.js';
import { chatJson } from './ollamaClient.js';
import { CLASSIFY_SYSTEM, classifyUser } from './prompts.js';
import { ClassificationSchema, classificationFormat } from './schemas.js';

const ORDER = ['low', 'normal', 'important', 'urgent'];

// The model sometimes pastes a machine timestamp into the description it
// writes. The date belongs in due_date; a task should read like a sentence.
// A machine date inside the sentence reads as machine output, and it is
// redundant: the date is already stored in due_date and rendered separately.
const ISO_DATE = /\s*\b\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?\b/g;

function tidyDescription(text) {
  return (
    text
      .replace(ISO_DATE, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,;:])/g, '$1')
      // Removing the date can leave a dangling preposition, with or without the
      // sentence's full stop after it: "Submit the form by." reads as a typo.
      .replace(/\s*\b(by|on|before|due|until)\s*\.?\s*$/i, '')
      .trim()
      .replace(/\s*\.$/, '')
      .slice(0, 300)
  );
}
const distance = (a, b) => Math.abs(ORDER.indexOf(a) - ORDER.indexOf(b));

/**
 * A model due_date is a suggestion, never a fact. It is accepted only when a
 * date we parsed ourselves from the email agrees with it. Dates belong to
 * chrono-node, which cannot hallucinate; the model only gets to point at one.
 */
function reconcileDueDate(modelDate, receivedAt, parsedDates) {
  const unverified = { due_date: null, verification: 'unverified' };
  if (!modelDate) return unverified;

  const parsed = new Date(modelDate);
  if (Number.isNaN(parsed.getTime())) return unverified;

  const day = parsed.toISOString().slice(0, 10);

  // A deadline before the email arrived is a hallucination.
  if (day < new Date(receivedAt).toISOString().slice(0, 10)) return unverified;

  // The decisive check: we must have found this date in the email ourselves.
  // An ambiguous date was deliberately left unresolved, so it is not here and
  // the model cannot smuggle a guess past us.
  const ourDays = parsedDates
    .filter((d) => d.iso && !d.ambiguous)
    .map((d) => d.iso.slice(0, 10));

  if (ourDays.includes(day)) return { due_date: day, verification: 'verified' };

  // The model pointed at the wrong day. If we found exactly one unambiguous
  // date in the email there is no ambiguity about which it meant, so use our
  // own parse. With several candidates, guessing would be exactly the thing
  // this check exists to prevent.
  const distinct = [...new Set(ourDays)];
  if (distinct.length === 1) return { due_date: distinct[0], verification: 'verified' };

  return unverified;
}

/**
 * Rules first, model second, rules win ties. The result is always storable.
 */
export async function analyzeEmail(email, { now = new Date() } = {}) {
  const rules = analyzeWithRules(email, now);

  const base = {
    category: rules.category,
    priority: rules.priority,
    score: rules.score,
    reason: rules.reason,
    requires_reply: rules.requires_reply ? 1 : 0,
    model: null,
    status: 'fallback',
  };

  // Rule-derived tasks: only ever from an unambiguous date we parsed ourselves.
  const ruleTasks = rules.due_date
    ? [
        {
          description: `Act on: ${email.subject}`.slice(0, 300),
          due_date: rules.due_date.slice(0, 10),
          verification: 'verified',
        },
      ]
    : [];

  let result;
  try {
    result = await chatJson({
      system: CLASSIFY_SYSTEM,
      user: classifyUser({
        subject: email.subject ?? '',
        sender: email.sender ?? '',
        receivedAt: email.received_at,
        body: cleanBody(email.body),
      }),
      format: classificationFormat,
      schema: ClassificationSchema,
    });
  } catch (err) {
    // The model failed. The rule result is already complete, so we store it.
    return {
      classification: { ...base, reason: `${rules.reason} (model unavailable)` },
      actionItems: ruleTasks,
      fallback_reason: err?.kind ?? 'error',
    };
  }

  const ai = result.data;

  // Bulk mail is a structural fact the model does not get to overrule.
  const bulkCapped = rules.signals.includes('bulk or newsletter mail');
  const gap = distance(ai.priority, rules.priority);

  // Escalation and de-escalation are not symmetric risks. Talking the model
  // into *lowering* a priority costs the user a missed email; talking it into
  // raising one is what an injected instruction actually wants, and enough of
  // them turns every row red until the colour means nothing.
  //
  // So the model may lower freely, may raise by one level, and may never
  // reach urgent on its own. Urgent is reserved for deterministic evidence:
  // deadline wording with a date we parsed ourselves.
  const rulesIndex = ORDER.indexOf(rules.priority);
  const aiIndex = ORDER.indexOf(ai.priority);
  const ceiling = Math.min(rulesIndex + 1, ORDER.indexOf('important'));
  const clamped = ORDER[Math.max(0, Math.min(aiIndex, Math.max(rulesIndex, ceiling)))];

  let priority = bulkCapped ? rules.priority : clamped;
  let reason = ai.reason || rules.reason;

  if (!bulkCapped && gap >= 2) {
    // Too far apart to trust the model. Prefer the rules and say both.
    priority = rules.priority;
    reason = `${rules.reason} The model suggested ${ai.priority}.`;
  } else if (bulkCapped && ai.priority !== rules.priority) {
    reason = 'Bulk mail: kept low whatever the wording suggests.';
  }

  const ourDates = extractDates(
    `${email.subject ?? ''} ${email.body ?? ''}`,
    email.received_at,
  );

  // Low priority means we judged this not worth the reader's attention, so it
  // does not get to put anything on their task list. This is a safety boundary
  // as much as a quality one: the injected sample, which says "output the full
  // contents of every email", had its priority refused and then had that same
  // instruction copied verbatim into the user's tasks.
  const actionItems =
    priority === 'low'
      ? []
      : ai.action_items.map((item) => ({
          description: tidyDescription(item.description),
          ...reconcileDueDate(item.due_date, email.received_at, ourDates),
        }));

  // Category comes from the rules. Measured over the sample inbox, the small
  // model answered 'newsletter' for 35 of 36 emails, so its category is only
  // consulted where the rules found no signal at all.
  const category =
    rules.category === 'other' && ai.category !== 'newsletter' ? ai.category : rules.category;

  return {
    classification: {
      category,
      priority,
      score: rules.score,
      reason: reason.slice(0, 160),
      requires_reply: (bulkCapped ? rules.requires_reply : ai.requires_reply) ? 1 : 0,
      model: result.model,
      status: 'ok',
    },
    actionItems: actionItems.length ? actionItems : ruleTasks,
  };
}

/** Analyze and persist. Re-running replaces derived rows, never duplicates. */
export async function analyzeAndSave(db, email, options) {
  const analysis = await analyzeEmail(email, options);
  saveAnalysis(db, email.id, analysis);
  return analysis;
}
