// Relative time, shown in the mono font so the list stays aligned.
const UNITS = [
  ['y', 31_536_000_000],
  ['mo', 2_592_000_000],
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
];

export function relativeTime(iso, now = Date.now()) {
  const diff = now - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  if (diff < 60_000) return 'now';

  for (const [suffix, ms] of UNITS) {
    if (diff >= ms) return `${Math.floor(diff / ms)}${suffix}`;
  }
  return 'now';
}

export function absoluteTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * A due date as a person would say it. Raw ISO in a task list reads as
 * machine output and makes "is this soon?" a calculation rather than a glance.
 */
export function dueLabel(isoDate, now = new Date()) {
  if (!isoDate) return null;

  const due = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);

  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days < -1) return `${Math.abs(days)} days ago`;
  if (days < 7) return due.toLocaleDateString(undefined, { weekday: 'long' });

  return due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** True when a due date has passed. */
export function isOverdue(isoDate, now = new Date()) {
  if (!isoDate) return false;
  return isoDate < now.toISOString().slice(0, 10);
}
