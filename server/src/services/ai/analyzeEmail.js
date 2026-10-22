import { analyzeWithRules } from '../priority/ruleEngine.js';
import { saveAnalysis } from '../../db/queries.js';
import { cleanBody } from './clean.js';
import { chatJson } from './ollamaClient.js';
import { CLASSIFY_SYSTEM, classifyUser } from './prompts.js';
import { ClassificationSchema, classificationFormat } from './schemas.js';

const ORDER = ['low', 'normal', 'important', 'urgent'];
const distance = (a, b) => Math.abs(ORDER.indexOf(a) - ORDER.indexOf(b));

/**
 * A model due_date is a suggestion, not a fact. We accept it only if it is a
 * real date that is not before the email arrived; otherwise the task is kept
 * with no date and marked unverified.
 */
function reconcileDueDate(modelDate, receivedAt) {
  if (!modelDate) return { due_date: null, verification: 'unverified' };

  const parsed = new Date(modelDate);
  if (Number.isNaN(parsed.getTime())) return { due_date: null, verification: 'unverified' };

  // A deadline before the email was sent is a hallucination.
  if (parsed.getTime() < new Date(receivedAt).getTime() - 86_400_000) {
    return { due_date: null, verification: 'unverified' };
  }

  return { due_date: parsed.toISOString().slice(0, 10), verification: 'verified' };
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
    ? [{
        description: `Act on: ${email.subject}`.slice(0, 300),
        due_date: rules.due_date.slice(0, 10),
        verification: 'verified',
      }]
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

  let priority = bulkCapped ? rules.priority : ai.priority;
  let reason = ai.reason || rules.reason;

  if (!bulkCapped && gap >= 2) {
    // Too far apart to trust the model. Prefer the rules and say both.
    priority = rules.priority;
    reason = `${rules.reason} The model suggested ${ai.priority}.`;
  } else if (bulkCapped && ai.priority !== rules.priority) {
    reason = 'Bulk mail: kept low whatever the wording suggests.';
  }

  const actionItems = ai.action_items.map((item) => ({
    description: item.description.slice(0, 300),
    ...reconcileDueDate(item.due_date, email.received_at),
  }));

  return {
    classification: {
      category: bulkCapped ? rules.category : ai.category,
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
