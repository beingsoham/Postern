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
