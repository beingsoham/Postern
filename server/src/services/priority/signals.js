// Deterministic text signals. Each one is cheap, explainable, and does not
// need a model. The model only decides what these cannot.

export const DEADLINE_WORDS = [
  'today',
  'tonight',
  'by eod',
  'end of day',
  'asap',
  'immediately',
  'due',
  'deadline',
  'before 5',
  'by 5 pm',
  'closes',
  'expires',
  'last chance',
  'final hours',
  'no further extensions',
];

// Something is broken or has gone wrong. This carries no deadline wording,
// which is why a failing build scored as low as a routine note before.
export const FAILURE_WORDS = [
  'failed',
  'failing',
  'failure',
  'error',
  'exception',
  'crash',
  'broken',
  'outage',
  'incident',
  'declined',
  'rejected',
  'expired',
  'blocked',
  'on hold',
  'unable to',
];

export const SECURITY_WORDS = [
  'password',
  'sign-in',
  'signin',
  'login',
  'suspicious',
  'unauthorised',
  'unauthorized',
  'unrecognised',
  'unrecognized',
  'breach',
  'advisory',
  'security alert',
  'verify your account',
];

export const RECRUITER_WORDS = [
  'interview',
  'recruiter',
  'hiring',
  'role',
  'position',
  'offer',
  'take-home',
  'availability',
  'shortlist',
  'placement',
];

export const FINANCE_WORDS = [
  'invoice',
  'payment',
  'billing',
  'statement',
  'refund',
  'disbursal',
  'charged',
  'scholarship',
];

export const ACADEMIC_WORDS = [
  'lab report',
  'assignment',
  'semester',
  'exam',
  'professor',
  'submission',
  'rubric',
  'abstract',
  'hostel',
  'timetable',
  'library',
];

export const WORK_WORDS = [
  'pull request',
  ' pr ',
  'standup',
  'ci ',
  'build',
  'deploy',
  'merge',
  'review',
  'ticket',
  'migration',
  'production',
];

export const SOCIAL_WORDS = ['dinner', 'meetup', 'rsvp', 'connection request', 'party'];

// Sender shapes that are almost never a person expecting a reply.
export const NO_REPLY_PATTERNS = [
  /^no-?reply@/i,
  /^do-?not-?reply@/i,
  /^notifications?@/i,
  /^newsletter@/i,
  /^digest@/i,
  /^promo@/i,
  /^marketing@/i,
  /^alerts?@/i,
  /^info@/i,
  /^survey@/i,
  /^invitations?@/i,
];

export const NEWSLETTER_WORDS = [
  'unsubscribe',
  'manage your subscription',
  'email preferences',
  'view in browser',
  'this week in',
  'issue #',
  'stories picked for you',
];

export const countHits = (haystack, needles) =>
  needles.filter((n) => haystack.includes(n)).length;

export const anyMatch = (value, patterns) => patterns.some((p) => p.test(value));
