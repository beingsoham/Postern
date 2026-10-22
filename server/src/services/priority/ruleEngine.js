import {
  ACADEMIC_WORDS, DEADLINE_WORDS, FAILURE_WORDS, FINANCE_WORDS, NEWSLETTER_WORDS,
  NO_REPLY_PATTERNS, RECRUITER_WORDS, SECURITY_WORDS, SOCIAL_WORDS,
  WORK_WORDS, anyMatch, countHits,
} from './signals.js';
import { earliestDate, extractDates, hoursUntil } from './dates.js';

const CATEGORY_WORDS = {
  academic: ACADEMIC_WORDS,
  work: WORK_WORDS,
  recruiting: RECRUITER_WORDS,
  finance: FINANCE_WORDS,
  security: SECURITY_WORDS,
  social: SOCIAL_WORDS,
};

// Bulk mail is recognised from its shape, not its words. This is what keeps a
// newsletter shouting URGENT from ever becoming urgent.
//
// A List-Unsubscribe header, or unsubscribe language in the body, means the
// sender is broadcasting. A no-reply address does NOT: a failing build and a
// security alert both arrive from notifications@, and neither is marketing.
// That distinction only decides whether a reply is expected.
function looksLikeBulk(email, haystack) {
  if (email.list_unsubscribe) return true;
  return countHits(haystack, NEWSLETTER_WORDS) > 0;
}

// Automated senders never expect a reply, whatever else is true of them.
function isAutomatedSender(email) {
  return anyMatch(email.sender ?? '', NO_REPLY_PATTERNS);
}

function pickCategory(haystack, bulk) {
  if (bulk) {
    // A security alert from alerts@ is still security, not marketing.
    return countHits(haystack, SECURITY_WORDS) >= 2 ? 'security' : 'newsletter';
  }

  let best = 'other';
  let bestScore = 0;
  for (const [category, words] of Object.entries(CATEGORY_WORDS)) {
    const score = countHits(haystack, words);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : 'other';
}

function scoreToPriority(score) {
  if (score >= 70) return 'urgent';
  if (score >= 45) return 'important';
  if (score >= 20) return 'normal';
  return 'low';
}

/**
 * Deterministic analysis. Always returns a usable result, which is what makes
 * it a safe fallback when the model is unavailable or returns nonsense.
 */
export function analyzeWithRules(email, now = new Date()) {
  const subject = (email.subject ?? '').toLowerCase();
  const body = (email.body ?? '').toLowerCase();
  const haystack = `${subject} ${body}`;

  const bulk = looksLikeBulk(email, haystack);
  const category = pickCategory(haystack, bulk);

  const dates = extractDates(`${email.subject ?? ''} ${email.body ?? ''}`, email.received_at);
  const soonest = earliestDate(dates);
  const hours = hoursUntil(soonest, now);

  const signals = [];
  let score = 15;

  const deadlineHits = countHits(haystack, DEADLINE_WORDS);
  if (deadlineHits && !bulk) {
    score += Math.min(deadlineHits * 12, 30);
    signals.push('deadline language');
  }

  if (hours !== null && !bulk) {
    if (hours <= 24) { score += 30; signals.push('date within a day'); }
    else if (hours <= 72) { score += 18; signals.push('date within three days'); }
    else if (hours <= 168) { score += 8; signals.push('date this week'); }
  }

  // A direct question usually wants an answer from a human.
  const asksQuestion = /\?/.test(email.subject ?? '') || /\?/.test(email.body ?? '');
  const fromPerson = !isAutomatedSender(email) && !bulk;
  if (asksQuestion && fromPerson) { score += 18; signals.push('direct question'); }

  const failureHits = countHits(haystack, FAILURE_WORDS);
  if (failureHits && !bulk) {
    score += Math.min(failureHits * 15, 30);
    signals.push('something has failed or is blocked');
  }

  if (category === 'security' && !bulk) { score += 25; signals.push('security topic'); }
  if (category === 'recruiting' && fromPerson) { score += 12; signals.push('recruiter contact'); }

  if (email.known_sender) { score += 15; signals.push('known sender'); }

  // Deadline wording and a same-day date are much stronger together than
  // either alone: that combination is what 'urgent' actually means.
  if (deadlineHits && hours !== null && hours <= 24 && !bulk) {
    score += 10;
    signals.push('a stated deadline falling today');
  }

  // Context decides. Bulk mail is capped no matter what words it contains.
  if (bulk) {
    score = Math.min(score, 15);
    signals.push('bulk or newsletter mail');
  }

  if (email.direction === 'out') {
    score = Math.min(score, 15);
    signals.push('sent by you');
  }

  score = Math.max(0, Math.min(100, score));
  const priority = scoreToPriority(score);

  const requiresReply = Boolean(asksQuestion && fromPerson && email.direction !== 'out');

  return {
    category,
    priority,
    score,
    requires_reply: requiresReply,
    reason: buildReason({ bulk, signals, hours, priority }),
    signals,
    dates,
    due_date: soonest,
    ambiguous_date: dates.some((d) => d.ambiguous),
  };
}

function buildReason({ bulk, signals, hours, priority }) {
  if (bulk) return 'Bulk mail: kept low whatever the wording suggests.';
  if (!signals.length) return 'No deadline, question or known sender was detected.';

  const when =
    hours === null ? null
      : hours <= 24 ? 'a date within a day'
        : hours <= 72 ? 'a date within three days'
          : null;

  const parts = signals.filter((s) => !s.startsWith('date ')).slice(0, 2);
  if (when) parts.push(when);

  return `Marked ${priority} because of ${parts.join(' and ')}.`;
}
